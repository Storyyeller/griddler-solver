import os, operator, collections, random, itertools

from solver import solve, getStats, solveDFS, getMultipleSolutions, getStatsAndTime
from util import Timer, groupby

# puzzle_raw = [
# 	[[1,5],[1,1,3],[1,1,2],[2,2],[1,7],[8],[2,5],[4],[2],[2]],
# 	[[3,3],[2],[5],[4],[4],[1,6],[2,6],[8],[5],[1]]
# 	]

def ncr(n, r):
    r = min(r, n-r)
    if r == 0:
    	return 1
    numer = reduce(operator.mul, xrange(n, n-r, -1))
    denom = reduce(operator.mul, xrange(1, r+1))
    return numer//denom

def calcSlacks(data):
	R, C = map(len, data)
	print 'size', (R, C)

	pairs = [(vals, C) for vals in data[0]] + [(vals, R) for vals in data[1]]
	for vals, M in pairs:
		if not vals:
			print 1
		else:
			slack = M - sum(vals) - (len(vals)-1)
			k = len(vals) #one less than number of gaps
			print ncr(slack + k, k)

def parseFile(fname):
	with open(fname,'r') as f:
		lines = f.read().split('\n')
	lines = filter(None, map(str.strip, lines))
	ri = lines.index('rows')
	ci = lines.index('columns')
	gi = [i for i,s in enumerate(lines) if s[:4] == 'goal'][0]

	rdata = lines[ri+1:ci]
	cdata = lines[ci+1:gi]
	return [
		[([] if s == '0' else map(int, s.split(','))) for s in rdata],
		[([] if s == '0' else map(int, s.split(','))) for s in cdata]
		]

def printSolution(puz):
	R, C = puz.size
	grid = [['?']*C for _ in range(R)]
	for cell in puz.cells:
		r, c = cell.key
		assert(cell.vals)
		if cell.vals == set([0]):
			grid[r][c] = ' '
		elif cell.vals == set([1]):
			grid[r][c] = 'X'
	return '\n'.join(''.join(row) for row in grid)

# import gc
# for fname in os.listdir('sample-simpson'):
# 	if fname.endswith('.non'):
# 		if fname.split('.')[0] in ('faase','meow','webpbn-22336'):
# 			continue

# 		puzzle_raw = parseFile(os.path.join('sample-simpson', fname))
# 		print fname, map(len, puzzle_raw)

# 		puz = solve(puzzle_raw)
# 		# print printSolution(puz)
# 		print 'cells solved {}/{}'.format(sum(len(cn.vals) == 1 for cn in puz.cells), len(puz.cells))
# 		print 'gaps solved {}/{}'.format(sum(len(cn.vals) == 1 for cn in puz.gaps), len(puz.gaps))
# 		gapvals = [len(n.vals) for n in puz.gaps if len(n.vals)>2]
# 		# print sorted(gapvals)[::-1]
# 		print 'est difficulty', len(gapvals), sum(gapvals)

# 		del puz, gapvals, puzzle_raw, n
# 		gc.collect()

# dirname = os.path.join('scraper','results')
dirname = os.path.join('hardtests')
stats = {}

results = dict(map(str.split, open('multiple.txt','r').read().split('\n')))
done = set()
times = []

with Timer("total solving time"):
	for fname in os.listdir(dirname):
		if fname in done or results.get(fname, 'False') == 'True':
			continue

		# print 'trying', fname
		path = os.path.join(dirname, fname)
		puzzle_raw = parseFile(path)
		# result = getStats(puzzle_raw)
		result, dur = getStatsAndTime(puzzle_raw)
		stats[fname] = result
		if result != 'skipped':
			times.append(dur)
		done.add(fname)
		print fname, result
	print collections.Counter(stats.values())
bad = groupby(stats, stats.get)['unsolved']
open('unsolved.txt','w').write(' '.join(sorted(bad)))

times = sorted(times)
print len(times), sum(times)/len(times), times[len(times)//2]
for cutoff in [1.0, 3.1, 10.0]:
	print len([t for t in times if t < cutoff])
print times[-20:]

# unsolved = open('unsolved.txt','r').read().split()
# results['11820.non'] = 'True'
# for fname in unsolved:
# 	if fname in results:
# 		continue
# 	path = os.path.join(dirname, fname)
# 	puzzle_raw = parseFile(path)
# 	print 'testing', fname
# 	sols = getMultipleSolutions(puzzle_raw)
# 	print '!!! {} {}'.format(fname, sols is not None)
# 	if sols is not None:
# 		print 'first solution'
# 		print printSolution(sols[0])
# 		print 'second solution'
# 		print printSolution(sols[1])
# 		for puz in sols:
# 			for n in puz.cells + puz.gaps:
# 				assert(len(n.vals) == 1)
# 	results[fname] = str(sols is not None)

# data = '\n'.join('{} {}'.format(k, v) for k, v in results.items())
# open('multiple.txt','w').write(data)


# puzzle_raw = parseFile(os.path.join(dirname, '10043.non'))
# puzzle_raw = parseFile(os.path.join('sample-simpson', 'knotty.non'))

# dom_clues = [[3],[1],[1,3],[1],[1,3],[1],[1,3],[1],[1,3],[1],[1,3],[1],[1,3],[1],[1]]
# dom_clues = [[3],[1]] + [[1,3],[1]]*26 + [[1]]
# puzzle_raw = [dom_clues, dom_clues]
# puzzle_raw = parseFile(os.path.join(dirname, '8274.non'))
# for sol in list(solve(puzzle_raw)):
# 	print sol.count()
# 	print printSolution(sol)

# puz = solve(puzzle_raw)
# print printSolution(puz)
# print puz.count(), 'squares left'
