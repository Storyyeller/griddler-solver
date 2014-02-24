unsolved = set(open('unsolved.txt','r').read().split())
results = dict(map(str.split, open('multiple.txt','r').read().split('\n')))
results['11820.non'] = 'True'
results['607.non'] = 'True'

outlines = [s for s in open('out6.txt','r').read().split('\n') if s[:3] == '!!!']
new_results = {s[1]:s[2] for s in map(str.split, outlines)}
print len(results), len(new_results), len(set(results) & set(new_results))
results.update(new_results)

data = '\n'.join('{} {}'.format(k, v) for k, v in results.items())
open('multiple.txt','w').write(data)

# import os, shutil
# testset = [x for x in unsolved if results.get(x, 'False') != 'True']
# print len(unsolved), len(results), len(testset)
# dirname = os.path.join('scraper','results')
# dirname2 = os.path.join('hardtests')

# for fname in testset:
# 	shutil.copy2(os.path.join(dirname, fname), os.path.join(dirname2, fname))
# 	print fname,