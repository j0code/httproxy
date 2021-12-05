# httproxy
An http reverse proxy that makes subdomains work

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

  `dest`: the destination. This should be a webserver, either local or on the web
  
  `secure`: determines whether to use https or not (e.g. when using apache, you might want to set it to secure since it will try to upgrade)
  
  ### certbot support
configure certbot to place .well-known files into the repository folder, the proxy will expose them
  
