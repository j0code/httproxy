# httproxy
An http reverse proxy that makes subdomains work

## BUGS
Known bugs:
- when trying to connect to an apache server over https, it'll throw an EPROTO ssl error.
  (at least with openssl 3.0.0)


### config.json
Create a file 'config.json' after cloning that contains the following:
```json
{
	"http": {
		"port": 80
	}, "https": {
		"port": 443,
		"cert": {
			"key": "./cert/privkey.pem",
			"fullchain": "./cert/fullchain.pem"
		}
	}, "hosts": {
		"example.localhost": { "dest": "localhost:70", "secure": true },
		"example.localhost": { "dest": "localhost:71", "secure": false },
		"example.yourdomain.com": { "dest": "localhost:70", "secure": true }
	}
}
```
`http.port`: port for the http server

`http.upgrade`: true/false, auto upgrade requests to https (not yet implemented)

`https.port`: port for https server

`https.cert`: location of your certificate


`hosts`: a list of hosts

a host is the part of the url that the user entered in their browser without url scheme and path (e.g. example.com)

  `hosts.host.dest`: the destination. This should be a webserver, either local or on the web
  
  `hosts.host.secure`: determines whether to use https or not (e.g. when using apache, you might want to set it to secure since it will try to upgrade)
  Note: currently broken
  
  `hosts.host.as`: Optional. If given, it will replace the host with this string in host/origin/referer headers (useful if a webserver blocks requests from other origins)
  Example: example.com (it might block localhost requests)
  
  ### certbot support
configure certbot to place .well-known files into the repository folder, the proxy will expose them
  
