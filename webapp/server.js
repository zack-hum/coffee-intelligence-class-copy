const http = require("http");

// Every host (App Service, Cloud Run, Elastic Beanstalk) tells the app which
// port to listen on through PORT.
const port = process.env.PORT || 8080;
const environment = process.env.ENVIRONMENT || "local";

// GCP and AWS set CLOUD in Terraform. App Service always sets WEBSITE_SITE_NAME,
// so Azure is recognized without changing its infrastructure.
const cloud =
  process.env.CLOUD ||
  (process.env.WEBSITE_SITE_NAME ? "Azure App Service" : "your machine");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html>
<html>
  <head><title>Web App (${environment})</title></head>
  <body style="font-family: sans-serif; margin: 3rem;">
    <h1>Hello from ${cloud}</h1>
    <p>Environment: <strong>${environment}</strong></p>
    <p>Infrastructure deployed with Terraform.</p>
  </body>
</html>`);
});

server.listen(port, () => {
  console.log(`Listening on port ${port} (${environment})`);
});
