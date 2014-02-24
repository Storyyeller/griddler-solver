import itertools, collections, operator
from util import maskToInds, SetStack, groupby, make_unique
ODict = collections.OrderedDict

def prune(self, forbid, dirty):
	if forbid.isdisjoint(self.vals):
		return
	assert(not self.vals <= forbid)
	# if type(self) == MarkNode and self.vns[0].key == ('r', 22, 9):
	# 	assert(not self.vals <= (forbid | set([32, 31])))
	self.vals -= forbid
	dirty.add(self)
	for listener in self.listeners:
		dirty.add(listener)

class GapNode(object):
	def __init__(self, key, vals):
		self.key = key
		self.vals = vals
		self.edges = {} #val -> set(cn, val)
		self.sides = [None, None]
		self.listeners = []
		assert(self.vals)

	def update(self, dirty, puz):
		forbid = reduce(set.intersection, map(self.edges.get, self.vals))
		for cn, val in sorted(forbid, key=lambda t:t[0].key):
			prune(cn, set([val]), dirty)

		left, right = self.sides
		if left is not None:
			ok = set(zip(*self.vals)[0])
			forbid = set(x for x in left.vals if x+left.size not in ok)
			prune(left, forbid, dirty)
		if right is not None:
			ok = set(zip(*self.vals)[-1]) #important, always use 0 and -1 since may not be pair after previous merging
			prune(right, right.vals - ok, dirty)

class MarkNode(object):
	def __init__(self, vn1, vn2, size):
		self.vns = vn1, vn2
		self.size = size
		assert(size > 0 and vn1 is not vn2)

		vals1 = set(v[-1] for v in vn1.vals) #important, always use 0 and -1 since may not be pair after previous merging
		vals2 = set(v[0]-size for v in vn2.vals)
		assert(vals1 == vals2)
		self.vals = vals1
		vn1.sides[1] = vn2.sides[0] = self
		self.listeners = []

	def update(self, dirty, puz):
		vn1, vn2 = self.vns

		while 1:
			set1 = set(v for v in vn1.vals if v[-1] not in self.vals)
			set2 = set(v for v in vn2.vals if v[0]-self.size not in self.vals)
			prune(vn1, set1, dirty)
			prune(vn2, set2, dirty)
			oldvals, self.vals = self.vals, set(v[-1] for v in vn1.vals) & set(v[0]-self.size for v in vn2.vals)
			if oldvals == self.vals:
				break

		# if 1 < min(len(vn1.vals), len(vn2.vals)) <= len(self.vals):
		# 	lists1 = groupby(vn1.vals, key=lambda t:t[-1])
		# 	lists2 = groupby(vn2.vals, key=lambda t:t[0]-self.size)
		# 	if all(len(v) <= 1 for v in lists2.values()):
		# 		self.merge(0, lists2, dirty, puz)
		# 	elif all(len(v) <= 1 for v in lists1.values()):
		# 		self.merge(1, lists1, dirty, puz)

	def merge(self, which, othervals, dirty, puz):
		vmap = collections.defaultdict(list)
		newvals = []
		newedges = {}
		main, other = self.vns if which == 0 else self.vns[::-1]

		for val in main.vals:
			v = val[-1] if which == 0 else val[0]-self.size
			if not othervals[v]:
				continue
			assert(len(othervals[v]) == 1)
			val2 = othervals[v][0]
			newset = main.edges[val] | other.edges[val2]
			newset = set(t for t in newset if t[1] in t[0].vals)
			newv = (val + val2) if which == 0 else (val2 + val)
			newvals.append(newv)
			newedges[newv] = newset

			vmap[main, val].append(newv)
			vmap[other, val2].append(newv)
		for v in main.vals:
			assert(len(vmap[main, v]) <= 1)
		for v in other.vals:
			assert(len(vmap[other, v]) >= 1)

		#now update neighbors
		cellpairs = []
		for val in main.vals:
			cellpairs += main.edges[val]
		for val in other.vals:
			cellpairs += other.edges[val]

		revnodes = main.listeners + other.listeners
		for cell in set(zip(*cellpairs)[0]):
			for edged in cell.edges.values():
				s1 = edged.setdefault(main, set()) & main.vals
				s2 = edged.setdefault(other, set()) & other.vals
				merged = set()
				for v1 in s1:
					merged.update(vmap[main, v1])
				for v2 in s2:
					merged.update(vmap[other, v2])
				edged[main] = merged
				del edged[other]
			revnodes += cell.listeners

		for rnode in make_unique(revnodes):
			dirty.discard(rnode)
			rnode.update(dirty, puz)
			if not rnode.alive():
				continue
			newchoices = []
			for node, val in rnode.choices:
				if node in (main, other):
					newchoices.extend((main, v) for v in vmap[node, val])
				else:
					newchoices.append((node, val))
			rnode.choices = newchoices

		ind = 1-which
		main.sides[ind] = other.sides[ind]
		if other.sides[ind] is not None:
			temp = other.sides[ind]
			if which == 0:
				temp.vns = main, temp.vns[1]
			else:
				temp.vns = temp.vns[0], main
		assert(self not in main.sides)

		if main.sides[0] is not None:
			# assert(all(v[0]-main.sides[0].size in main.sides[0].vals for v in newvals))
			assert(main.sides[0].vns[1] is main)
			# print 'left', main.sides[0], main.sides[0].vals
		if main.sides[1] is not None:
			# assert(all(v[-1] in main.sides[1].vals for v in newvals))
			assert(main.sides[1].vns[0] is main)
			# print 'right', main.sides[1], main.sides[1].vals
		assert(len(other.vals) <= len(newvals) <= len(main.vals))
		assert(len(newvals) == len(set(newvals)))

		main.listeners += make_unique(other.listeners, main.listeners)
		main.vals = set(newvals)
		main.edges = newedges
		dirty.discard(self)
		dirty.discard(other)
		dirty.add(main)
		puz.gaps.remove(other)

class CellNode(object):
	def __init__(self, key, vals):
		self.key = key
		self.vals = vals #set
		self.edges = {v:ODict() for v in vals} #val -> Ord(vn -> forbidden val set_
		self.listeners = []

	def update(self, dirty, puz):
		eds = [self.edges[v] for v in self.vals]
		cur = eds[0].copy()
		for ed in eds[1:]:
			for k in cur:
				#careful, these are mutable sets shared with edges!
				cur[k] = cur[k] & ed.get(k, set())
		for vn, forbid in cur.items():
			prune(vn, forbid, dirty)

class ReverseCellNode(object):
	def __init__(self, key, cell, val, choices):
		self.key = key
		self.vals = 1 #ugly hack to make sure we get updated in simplify()
		#choices are assignments consistent with cell=val. If none remain, we prune it
		self.cell, self.val, self.choices = cell, val, choices
		for node in self.getNodes():
			node.listeners.append(self)
		cell.listeners.append(self)

	def alive(self): return self.cell is not None
	def getNodes(self): return set(zip(*self.choices)[0]) if self.choices else set()

	def update(self, dirty, puz):
		if self.val not in self.cell.vals:
			self.removeSelf()
			self.cell = self.choices = None
			return

		old = self.getNodes()
		self.choices = [t for t in self.choices if t[1] in t[0].vals] #unordered list
		new = self.getNodes()
		for node in old-new:
			node.listeners.remove(self)
		if not new: #no possibilities left, time to prune
			self.removeSelf() #make sure to call this before prune, or else we'll get added back to the queue!
			prune(self.cell, set([self.val]), dirty)
			self.cell = self.choices = None

	def removeSelf(self):
		for node in self.getNodes():
			node.listeners.remove(self)
		self.cell.listeners.remove(self)

class Puzzle(object):
	def __init__(self, size, cells, gaps):
		self.size = size
		self.dirty = SetStack(cells + gaps)
		self.cells = cells
		self.gaps = gaps
		self.revnodes = []

	def valid(self): return all(cn.vals for cn in self.cells + self.gaps)
	def solved(self): return all(len(cn.vals) == 1 for cn in self.cells)
	def count(self): return sum(len(cn.vals) > 1 for cn in self.cells)

	def simplify(self):
		while self.dirty:
			# print len(self.dirty)
			cur = self.dirty.pop()
			if not cur.vals:
				assert(0)
				return False
			cur.update(self.dirty, self)
			for node in self.cells + self.gaps:
				if not node.vals:
					assert(node in self.dirty.q)
		assert(self.valid())
		return True

	def simplifyMore(self):
		assert(self.valid() and not self.revnodes)
		lists = collections.defaultdict(list)
		for gn in self.gaps:
			t = gn.key[0]
			assert(t in ('r','c'))
			for val, forbid in gn.edges.items():
				for cn, cval in forbid:
					lists[cn, cval, t].append((gn, val))

		for cn in self.cells:
			assert(cn.vals)
			if len(cn.vals) <= 1:
				continue
			self.revnodes.append(ReverseCellNode(('r', 1, cn.key), cn, 0, lists[cn, 1, 'r']))
			self.revnodes.append(ReverseCellNode(('c', 1, cn.key), cn, 0, lists[cn, 1, 'c']))
			self.revnodes.append(ReverseCellNode(('r', 0, cn.key), cn, 1, lists[cn, 0, 'r']))
			self.revnodes.append(ReverseCellNode(('c', 0, cn.key), cn, 1, lists[cn, 0, 'c']))
		for rnode in self.revnodes:
			self.dirty.add(rnode)
		return self.simplify()

	def getCellPairRelation(self, rnodes, t, k1, k2):
		rns = map(rnodes.get, [(t, 0, k1), (t, 1, k1), (t, 0, k2), (t, 1, k2)])
		if None in rns:
			return None
		sets = [set(rn.choices) for rn in rns]
		implies = [{}, {}]
		for (v1, s1), (v2, s2) in itertools.product(enumerate(sets[:2]), enumerate(sets[2:])):
			if not s1 & s2:
				implies[0][v1] = v2 ^ 1
				implies[1][v2] = v1 ^ 1
		return implies

	def simplifyRows(self):
		nrows, ncols = self.size
		rnodes = {rn.key:rn for rn in self.revnodes if rn.alive()}
		cnodes = {cn.key:cn for cn in self.cells if len(cn.vals) > 1}
		gnodes = {cn.key:cn for cn in self.gaps if len(cn.vals) > 1}

		while 1:
			done = True

			for doRow in [True, False]:
				if doRow:
					t, tp = 'rc'
					inds1, inds2 = range(nrows-1), range(ncols)
				else:
					t, tp = 'cr'
					inds1, inds2 = range(ncols-1), range(nrows)

				for R1 in inds1:
					R2 = R1+1
					implies = {}

					# if t == 'r' and R1 == 0:
					# 	import pdb;pdb.set_trace()

					for C in inds2:
						if doRow:
							k1, k2 = (R1, C), (R2, C)
						else:
							k1, k2 = (C, R1), (C, R2)

						relation = self.getCellPairRelation(rnodes, tp, k1, k2)
						if relation is None:
							continue

						for i in range(2):
							if i in relation[0]:
								implies[cnodes[k1], i] = cnodes[k2], relation[0][i] ^ 1 # ^1 because we want a contradiction
							if i in relation[1]:
								implies[cnodes[k2], i] = cnodes[k1], relation[1][i] ^ 1 # ^1 because we want a contradiction

					# if t == 'r' and R1 == 0:
					# 	print t, R1, R2, len(implies)
					# 	for cn, cv in implies:
					# 		cn2, cv2 = implies[cn, cv]
					# 		print '{} = {} -> {} = {}'.format(cn.key, cv, cn2.key, cv2)

					near_gaps = [gn for gn in self.gaps if len(gn.vals) > 1 and gn.key[0] == t and gn.key[1] in (R1, R2)]
					for gn in near_gaps:
						for val in sorted(gn.vals):
							forbid = set(implies[pair] for pair in gn.edges[val] if pair in implies)
							if not forbid:
								continue

							#check for contradictions on other row
							for gn2 in near_gaps:
								if gn.key[1] == gn2.key[1]:
									continue
								if all(forbid & gn2.edges[val2] for val2 in gn2.vals):
									prune(gn, set([val]), self.dirty)
									break

					done = done and not self.dirty
					if not self.simplify():
						return False

					for k,v in rnodes.items():
						if not v.alive():
							del rnodes[k]
			if done:
				break
		return True