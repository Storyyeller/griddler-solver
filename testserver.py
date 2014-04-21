import sys
from SimpleHTTPServer import SimpleHTTPRequestHandler
import BaseHTTPServer
import urllib
import cgi

# see http://stackoverflow.com/questions/12268835/is-it-possible-to-run-python-simplehttpserver-on-localhost-only

class RequestHandler(SimpleHTTPRequestHandler):
    # proxied_sites should be a set of websites of this form: ["griddlers.net", "webpbn.com"]
    # don't prepend http://www, and don't add any slashes
    def __init__(self, request, client_address, server):
        self.proxied_sites = set(["webpbn.com", "griddlers.net"])
        SimpleHTTPRequestHandler.__init__(self, request, client_address, server)

    def should_proxy(self, path):
        if self.path.startswith("/__proxy__/"):
            start = len("/__proxy__/")
            end = self.path.find("/", start)
            if end == -1:
                end = len(self.path)
            website = self.path[start:end]
            return website in self.proxied_sites

        return False

    def generate_real_url(self, path):
        start = len("/__proxy__/")
        return "http://" + path[start:]

    def do_GET(self):
        if self.should_proxy(self.path):
            real_url = self.generate_real_url(self.path)
            self.copyfile(urllib.urlopen(real_url), self.wfile)
        else:
            SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        if self.should_proxy(self.path):
            form = cgi.FieldStorage(
                fp = self.rfile,
                headers = self.headers,
                environ = {
                    "REQUEST_METHOD" : "POST",
                    "CONTENT_TYPE" : self.headers["Content-Type"]
                }
            )

            post_dict = {}
            for key in form:
                post_dict[key] = form[key].value
            post_data_str = urllib.urlencode(post_dict)

            real_url = self.generate_real_url(self.path)
            self.copyfile(urllib.urlopen(real_url, post_data_str), self.wfile)
        else:
            SimpleHTTPRequestHandler.do_POST(self)

def start_server(HandlerClass=RequestHandler,
         ServerClass=BaseHTTPServer.HTTPServer):

    protocol = "HTTP/1.0"
    host = "127.0.0.1"
    port = 8000
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if ':' in arg:
            host, port = arg.split(':')
            port = int(port)
        else:
            try:
                port = int(sys.argv[1])
            except:
                host = sys.argv[1]

    server_address = (host, port)

    HandlerClass.protocol_version = protocol
    httpd = ServerClass(server_address, HandlerClass)

    sa = httpd.socket.getsockname()
    print "Serving HTTP on", sa[0], "port", sa[1], "..."
    httpd.serve_forever()


if __name__ == "__main__":
    start_server()