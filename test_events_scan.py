import sys
sys.path.insert(0, 'backend')
import time
from services.automotive_events import scan_automotive_events

t = time.time()
r = scan_automotive_events(force=True)
print('elapsed', round(time.time() - t, 1))
print('success', r.get('success'))
print('count', r.get('count'))
print('sources', [(s['slug'], s['ok'], s['count'], (s['error'] or '')[:80]) for s in r.get('sources', [])])
sample = (r.get('events') or [{}])[0]
print('sample', sample)