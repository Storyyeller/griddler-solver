import httplib, urllib, time
connect = httplib.HTTPConnection

class PostHandler(object):
    def request(self, action, selector, headers={}, body="", Cookie="",
                readData=True, **kwargs):
        headers = headers.copy()

        c = connect("webpbn.com")
        c.request(action, selector, body, headers)
        response = c.getresponse()
        data = response.read() if readData else None
        print response.status, response.reason
        print response.getheaders(), '\n'

        self.r = response
        c.close()
        return data

    def get(self, selector, **kwargs):
        return self.request('GET',selector, **kwargs)

    def post(self, selector, params, **kwargs):
        if type(params) == dict:
            params = urllib.urlencode(params)

        headers = {"Content-type": "application/x-www-form-urlencoded",
                   "Accept": "text/plain"}
        headers = {}
        return self.request('POST',selector,
                            headers=headers, body=params, **kwargs)
c = PostHandler()

import os

fields = {'xml_clue':'on', 'xml_soln':'on', 'ss_soln':'on', 'sg_clue':'on', 'sg_soln':'on', 'go':'1', 'fmt':'ss'}
for i in range(18941, 23623):
    fname = os.path.join('results', '{}.non'.format(i))
    fields['id'] = str(i)
    data = c.post('/export.cgi', fields)
    print 'received', i

    if 'rows' in data:
        with open(fname, 'w') as f:
            f.write(data)