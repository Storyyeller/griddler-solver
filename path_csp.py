import itertools, collections, operator
from util import maskToInds, SetStack

class PathVarNode(object):
	def __init__(self, key, vals):
		self.key = key
		self.vals = vals #list of val indexes
		self.edges = {v:0 for v in vals} #val -> forbidden bitset
		self.mymask = sum(1<<x for x in vals)

class PathPuzzle(object):
	def __init__(self, vars, work_queue):
		self.vars = vars
		self.owner = own = {}
		# self.dirty = SetStack()
		self.dirty = work_queue

		for var in vars:
			for x in var.vals:
				own[x] = var
				# for target in vars:
				# 	if target is not var:
				# 		self.dirty.add((x, target))
		self.mask = sum(1<<x for x in own)
		print 'created path csp with {} vars and {} values'.format(len(vars), len(own))

	def valid(self): return all(cn.vals for cn in self.vars)
	def solved(self): return all(len(cn.vals) == 1 for cn in self.vars)
	def count(self): return sum(len(cn.vals) > 1 for cn in self.vars)

	def removeVal(self, x0):
		# print 'removing', x
		stack = [x0]
		while stack:
			x = stack.pop()
			if x not in self.owner:
				continue
			var = self.owner[x]
			del self.owner[x]
			del var.edges[x]
			var.vals.remove(x)
			var.mymask -= 1<<x
			self.mask -= 1<<x

			if len(var.vals) == 1:
				stack += maskToInds(var.edges[min(var.vals)] & self.mask)
				del self.owner[min(var.vals)]
			if len(self.owner) % 100 == 0:
				print '{} vars and {} values {} queue remaining'.format(self.count(), len(self.owner), len(self.dirty))

	def simplify(self):
		print 'initial queue length', len(self.dirty)
		while self.dirty:
			# print len(self.dirty),
			x1, v = self.dirty.pop()
			if x1 not in self.owner:
				continue
			v1 = self.owner[x1]

			if not v.vals:
				return False
			mask = v1.edges[x1]
			okvals = [x for x in v.vals if not mask & (1<<x)]
			# okmask = ~mask & v.mymask
			# if not okmask:
			if not okvals:
				self.removeVal(x1)
				continue

			intersect = reduce(operator.__and__, [v.edges[x] for x in okvals])
			# intersect = reduce(operator.__and__, [v.edges[x] for x in maskToInds(okmask)])
			newedges = intersect & ~mask & ~v1.mymask & self.mask
			if newedges:
				v1.edges[x1] |= newedges
				for x2 in maskToInds(newedges):
					v2 = self.owner[x2]
					v2.edges[x2] |= 1 << x1
					self.dirty.add((x1, v2))
					self.dirty.add((x2, v1))
		return True