import time, collections

def make_unique(seq, seed=()):
	temp = set(seed)
	return [x for x in seq if not x in temp and not temp.add(x)]

def maskToInds(m):
	vals = []
	while m:
		shift = m.bit_length() - 1
		vals.append(shift)
		m -= 1 << shift
	return vals

class Timer(object):
	def __init__(self, msg='time'):
		self.msg = msg
	def __enter__(self):
		self.t0 = time.time()
	def __exit__(self, exception_type, exception_value, traceback):
		if exception_type is None:
			print self.msg, time.time() - self.t0

class SetStack(object):
	def __init__(self, items=()):
		self.s = set(items)
		self.q = collections.deque(items)
		assert(len(self.q) == len(self.s))

	def pop(self):
		self.s.remove(self.q[0])
		return self.q.popleft()

	def add(self, v):
		if v not in self.s:
			self.s.add(v)
			self.q.append(v)

	def discard(self, v):
		if v in self.s:
			self.q.remove(v)
			self.s.remove(v)

	def __len__(self): return len(self.q)

def groupby(vals, key):
	d = collections.defaultdict(list)
	for v in vals:
		d[key(v)].append(v)
	return d