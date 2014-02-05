import itertools, collections, operator
from functools import partial

from csp import GapNode, MarkNode, CellNode, Puzzle, prune
from path_csp import PathPuzzle, PathVarNode
from util import maskToInds, Timer, SetStack

def processRowSingle(gaps, grid_row, tc, r, sizes, C):
	k = len(sizes)
	rsums = [sum(sizes[i:])+k-i-1 for i in range(k)]

	solutions = []
	stack = [(0,[])]
	while stack:
		i, prefix = stack.pop()
		assert(0 <= i <= k and len(prefix) <= C)
		if i == k:
			solutions.append(prefix + [0]*(C-len(prefix)))
		else:
			ming = 1 if i>0 else 0
			maxg = C-len(prefix) - rsums[i]
			for g in range(ming, maxg+1):
				stack.append((i+1, prefix + [0]*g + [1]*sizes[i]))
	# print 'full row node with {} solutions {}'.format(len(solutions), list(sizes))

	#initialize the sets. for each solution we use simple index as value
	gnode = GapNode((tc, r, 0), set(range(len(solutions))))
	for cn in grid_row:
		cn.edges[0][gnode] = set()
		cn.edges[1][gnode] = set()
	for val, pattern in enumerate(solutions):
		gnode.edges[val] = set()
		for cn, need in zip(grid_row, pattern):
			gnode.edges[val].add((cn, 1-need))
			cn.edges[1-need][gnode].add(val)
	gaps.append(gnode)
	return

def processRow(gaps, grid_row, tc, r, sizes, C):
	k = len(sizes)
	newgaps = []

	if len(sizes) <= 2 or sum(sizes)+k >= C: # at most 3 gaps or slack at most 1
		processRowSingle(gaps, grid_row, tc, r, sizes, C)
		return

	for i in range(1,k):
		smin = (sum(sizes[:i]) + i-1)
		emax = C - (sum(sizes[i:]) + k-i-1)
		keys = list(itertools.combinations(range(smin,emax+1), 2))

		gnode = GapNode((tc, r, i), set(keys))
		newgaps.append(gnode)
		for s, e in keys:
			temp = set((grid_row[p], 1) for p in range(s,e))
			temp |= set((grid_row[p], 0) for p in range(s-sizes[i-1], s))
			temp |= set((grid_row[p], 0) for p in range(e, e+sizes[i]))
			#0th and kth gaps determined by 1st and k-1th respectively
			if i == 1:
				temp |= set((grid_row[p], 1) for p in range(0, s-sizes[i-1]))
			if i == k-1:
				temp |= set((grid_row[p], 1) for p in range(e+sizes[i], C))

			gnode.edges[s, e] = temp
			for cn, val in temp:
				cn.edges[val].setdefault(gnode, set()).add((s, e))
	for i, size in enumerate(sizes[1:-1]):
		MarkNode(newgaps[i], newgaps[i+1], size)
	gaps += newgaps

def createPuzzle(data):
	rows, cols = data
	R, C = len(rows), len(cols)

	colors = frozenset([0,1])
	cells = [CellNode((i//C, i%C), colors) for i in xrange(R*C)]
	gaps = []

	for r, sizes in enumerate(rows):
		grid_row = cells[r*C:r*C+C]
		processRow(gaps, grid_row, 'r', r, sizes, C)
	for c, sizes in enumerate(cols):
		grid_row = cells[c::C]
		processRow(gaps, grid_row, 'c', c, sizes, R)

	return Puzzle((R, C), cells, gaps)

def createPathPuzzle(wpuz):
	assert(wpuz.count())
	cells = [cn for cn in wpuz.cells if len(cn.vals) > 1]
	gaps = [cn for cn in wpuz.gaps if len(cn.vals) > 1]

	work_queue = SetStack()
	val_ids = {}
	varmap = {}
	for node in cells + gaps:
		for val in node.vals:
			val_ids[node, val] = len(val_ids)
		varmap[node] = PathVarNode(node.key, set(val_ids[node, val] for val in node.vals))

	for cn in cells:
		newvar = varmap[cn]
		for val in cn.vals:
			ind = val_ids[cn, val]
			for vn, forbidden in cn.edges[val].items():
				if len(vn.vals) <= 1:
					continue
				for val2 in (forbidden & vn.vals): #forbid sets might not be updated
					newvar.edges[ind] |= 1 << val_ids[vn, val2]
					work_queue.add((ind, varmap[vn])) #important, don't move out of loop! There might be 0 valid edges

	marks = set()
	for gn in gaps:
		newvar = varmap[gn]
		for val in gn.vals:
			ind = val_ids[gn, val]
			for vn, val2 in gn.edges[val]:
				if len(vn.vals) <= 1 or val2 not in vn.vals:
					continue
				newvar.edges[ind] |= 1 << val_ids[vn, val2]
				work_queue.add((ind, varmap[vn]))
		marks.update(gn.sides)

	marks.discard(None)
	for mark in marks:
		vn1, vn2 = mark.vns
		if len(vn1.vals) <= 1 or len(vn2.vals) <= 1:
			continue
		size = mark.size
		new1, new2 = map(varmap.get, mark.vns)
		for val1, val2 in itertools.product(vn1.vals, vn2.vals):
			if val1[-1] + size == val2[0]: #this pair is compatible
				continue
			ind1 = val_ids[vn1, val1]
			ind2 = val_ids[vn2, val2]
			new1.edges[ind1] |= 1 << ind2
			new2.edges[ind2] |= 1 << ind1
			work_queue.add((ind1, new2))
			work_queue.add((ind2, new1))

	return PathPuzzle(map(varmap.get, (cells + gaps)), work_queue)

def simplify(puz):
	if not puz.simplify():
		return False
	if not puz.solved() and not puz.simplifyMore():
		return False
	assert(puz.valid())
	return True

def copy(puz):
	assert(not puz.dirty)
	cellmap = {cn: CellNode(cn.key, cn.vals.copy()) for cn in puz.cells}
	gapmap = {gn: GapNode(gn.key, gn.vals.copy()) for gn in puz.gaps}

	for gn_old in puz.gaps:
		gn = gapmap[gn_old]

		if len(gn.vals) > 1: #don't bother creating edges if it's already fixed
			for val in gn.vals:
				gn.edges[val] = set()
				for cn_old, cval in gn_old.edges[val]:
					assert(cn_old in cellmap)
					if len(cn_old.vals) <= 1: #don't bother creating edges if it's already fixed
						continue
					cn = cellmap[cn_old]
					gn.edges[val].add((cn, cval))
					cn.edges[cval].setdefault(gn, set()).add(val)
		if gn_old.sides[1] is not None:
			left, right = gn, gapmap[gn_old.sides[1].vns[1]]
			size = gn_old.sides[1].size
			MarkNode(left, right, size)

	puz2 = Puzzle(puz.size, map(cellmap.get, puz.cells), map(gapmap.get, puz.gaps))
	puz2.dirty = SetStack() #we already processed everything
	assert(puz2.valid())
	return puz2

# def splitDFS(puz):
# 	p1, p2 = puz, copy(puz)
# 	for n in p1.cells + p1.gaps: #be sure to remove reverse nodes, since we'll just create them again anyway!
# 		n.listeners = []

# 	unknown = [cn for cn in p2.cells if len(cn.vals) > 1]
# 	cell2 = max(unknown, key=lambda cn:len(cn.edges[0])+len(cn.edges[1])) #number of nontrival gapnodes it's connected too
# 	cell1 = [cn for cn in p1.cells if cn.key == cell2.key][0]
# 	prune(cell1, set([1]), p1.dirty)
# 	prune(cell2, set([0]), p2.dirty)
# 	return p1, p2
def doPrune(p, i, v):
	prune(p.cells[i], set([v]), p.dirty)
	return p

def cellScorer(puz, cell_ind):
	cn = puz.cells[cell_ind]
	ed1, ed2 = cn.edges[0], cn.edges[1]
	scores = []
	for gn in puz.gaps:
		score1 = len(gn.vals - ed1.get(gn, set()))
		score2 = len(gn.vals - ed2.get(gn, set()))
		scores.append(min(score1, score2))
	return tuple(sorted(scores))

def splitDFS(puz):
	for n in puz.cells + puz.gaps: #be sure to remove reverse nodes, since we'll just create them again anyway!
		n.listeners = []

	unknown = [i for i, cn in enumerate(puz.cells) if len(cn.vals) > 1]
	unknown = sorted(unknown, key=partial(cellScorer, puz))
	best, bestK, bestS = None, None, len(puz.cells)

	for cell_i in unknown:
		for v in range(2):
			new_puz = doPrune(copy(puz), cell_i, v)
			if not simplify(new_puz):
				print 'free reduction! (contradiction) after {} tries'.format(unknown.index(cell_i))
				puz = doPrune(puz, cell_i, 1-v)
				return (puz,) if simplify(puz) else ()
			elif new_puz.solved():
				print 'free reduction! (solution) after {} tries'.format(unknown.index(cell_i))
				puz = doPrune(puz, cell_i, 1-v)
				return (new_puz, puz) if simplify(puz) else (new_puz,)
			if bestS > new_puz.count():
				best, bestK, bestS = new_puz, (cell_i, v), new_puz.count()
	print 'searched {} unknowns, best split score {}'.format(len(unknown), bestS)

	cell_i, v = bestK
	puz = doPrune(puz, cell_i, 1-v)
	return (new_puz, puz) if simplify(puz) else (new_puz,)

def solveDFS(data):
	puz = createPuzzle(data)
	if not simplify(puz):
		return
	stack = [puz]
	while stack:
		cur = stack.pop()
		if cur.solved():
			yield cur
		else:
			print 'splitting depth', len(stack), cur.count()
			new = splitDFS(cur)
			# new = [p for p in new if simplify(p)]
			stack += sorted(new, key=lambda p:-p.count())

def getMultipleSolutions(data):
	it = solveDFS(data)
	try:
		return next(it), next(it)
	except StopIteration:
		return None

def getStats(data):
	R, C = map(len, data)
	if max(R, C) > 50:
		return 'skipped'
	# with Timer("Basic time"):
	puz = createPuzzle(data)
	puz.simplify()
	if puz.solved():
		return 'basic'
	puz.simplifyMore()
	if puz.solved():
		return 'reverse'

	puz.simplifyRows()
	if puz.solved():
		return 'adjacent'

	if puz.count() <= 9964:
		with Timer("Path creation/solve time"):
			puz2 = createPathPuzzle(puz)
			puz2.simplify()
			if puz2.solved():
				return 'path'
		assert(puz2.valid())
	return 'unsolved'

import time
def getStatsAndTime(data):
	t0 = time.time()
	res = getStats(data)
	return res, time.time()-t0


def solve(data):
	with Timer("total solve time"):
		with Timer("Creation time"):
			puz = createPuzzle(data)
		with Timer("Main solve time"):
			puz.simplify()
		# yield copy(puz)
		if not puz.solved():
			with Timer("Extra solve time"):
				puz.simplifyMore()
			# yield copy(puz)
		if not puz.solved():
			with Timer("Row solve time"):
				puz.simplifyRows()
			# yield copy(puz)
		if not puz.solved():
			with Timer("Path creation time"):
				puz = createPathPuzzle(puz)
			with Timer("Path solve time"):
				puz.simplify()
	return puz
