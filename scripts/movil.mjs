// Arranca el sistema para usarlo también desde celulares de la misma red wifi, con HTTPS
// (los navegadores solo prestan la cámara a páginas seguras).
//
//   npm run movil              → modo desarrollo (next dev)
//   npm run movil:produccion   → versión optimizada (antes: npm run build)
//
// En la computadora se sigue entrando por http://localhost:3000. Los celulares entran por
// https://<ip-de-esta-computadora>:3443. El certificado lo genera este script la primera vez
// (carpeta certificados/, no se sube a git). Para generarlo de nuevo, borra esa carpeta.

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const PUERTO_APP = Number(process.env.PORT ?? 3000);
const PUERTO_HTTPS = Number(process.env.PUERTO_HTTPS ?? 3443);
const modo = process.argv[2] === "produccion" ? "start" : "dev";
const raiz = process.cwd();
const dir = path.join(raiz, "certificados");
const rutaClave = path.join(dir, "clave.pem");
const rutaCert = path.join(dir, "certificado.pem");

// ---------- Direcciones de esta computadora en la red ----------

function ipsLocales() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
}

function nombreLocal() {
  try {
    if (process.platform === "darwin") return execFileSync("scutil", ["--get", "LocalHostName"], { encoding: "utf8" }).trim() + ".local";
  } catch {
    /* sin nombre de red */
  }
  return null;
}

// ---------- Certificado propio ----------

function crearCertificado() {
  fs.mkdirSync(dir, { recursive: true });
  const nombres = ["DNS:localhost", "IP:127.0.0.1", ...ipsLocales().map((ip) => `IP:${ip}`)];
  const local = nombreLocal();
  if (local && /^[a-zA-Z0-9.-]+$/.test(local)) nombres.push(`DNS:${local}`);
  const conf = path.join(dir, "openssl.cnf");
  fs.writeFileSync(
    conf,
    [
      "[req]",
      "distinguished_name = dn",
      "x509_extensions = ext",
      "prompt = no",
      "[dn]",
      "CN = Sistema de inventario (red local)",
      "O = Sistema de inventario",
      "[ext]",
      "basicConstraints = critical, CA:TRUE",
      "keyUsage = critical, digitalSignature, keyEncipherment, keyCertSign",
      "extendedKeyUsage = serverAuth",
      `subjectAltName = ${nombres.join(", ")}`,
      "",
    ].join("\n"),
  );
  // 397 días: el máximo que aceptan iPhone y Android para certificados de servidor.
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "397",
    "-keyout", rutaClave, "-out", rutaCert, "-config", conf], { stdio: "ignore" });
  fs.chmodSync(rutaClave, 0o600);
  console.log(`\n✓ Certificado creado para: ${nombres.map((n) => n.split(":")[1]).join(", ")}`);
}

if (!fs.existsSync(rutaClave) || !fs.existsSync(rutaCert)) {
  try {
    crearCertificado();
  } catch (e) {
    console.error("No se pudo crear el certificado con openssl:", e.message);
    process.exit(1);
  }
}
const clave = fs.readFileSync(rutaClave);
const cert = fs.readFileSync(rutaCert);
// Versión DER para instalarlo en el celular (opcional, quita el aviso de seguridad).
const certDer = Buffer.from(cert.toString().replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""), "base64");

// ---------- Servidor de la aplicación ----------

const nextBin = path.join(raiz, "node_modules", "next", "dist", "bin", "next");
const app = spawn(process.execPath, [nextBin, modo, "-p", String(PUERTO_APP)], { stdio: "inherit", env: process.env });
const terminar = () => {
  app.kill("SIGINT");
  process.exit(0);
};
process.on("SIGINT", terminar);
process.on("SIGTERM", terminar);
app.on("exit", (codigo) => process.exit(codigo ?? 0));

// ---------- HTTPS → aplicación ----------

const servidor = https.createServer({ key: clave, cert }, (req, res) => {
  if (req.url === "/certificado-inventario.crt") {
    res.writeHead(200, {
      "Content-Type": "application/x-x509-ca-cert",
      "Content-Disposition": 'attachment; filename="certificado-inventario.crt"',
    });
    res.end(certDer);
    return;
  }
  const destino = http.request(
    {
      host: "127.0.0.1",
      port: PUERTO_APP,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, "x-forwarded-proto": "https", "x-forwarded-for": req.socket.remoteAddress ?? "" },
    },
    (r) => {
      res.writeHead(r.statusCode ?? 502, r.headers);
      r.pipe(res);
    },
  );
  destino.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("El sistema todavía está arrancando. Recarga en unos segundos.");
  });
  req.pipe(destino);
});

// WebSocket (recarga automática en modo desarrollo).
servidor.on("upgrade", (req, socket, cabeza) => {
  const destino = net.connect(PUERTO_APP, "127.0.0.1", () => {
    const lineas = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) lineas.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    destino.write(lineas.join("\r\n") + "\r\n\r\n");
    if (cabeza?.length) destino.write(cabeza);
    destino.pipe(socket);
    socket.pipe(destino);
  });
  destino.on("error", () => socket.destroy());
  socket.on("error", () => destino.destroy());
});

servidor.listen(PUERTO_HTTPS, "0.0.0.0", () => {
  const ips = ipsLocales();
  console.log("\n📱 Para usarlo en el celular (misma red wifi), abre:");
  for (const ip of ips) console.log(`     https://${ip}:${PUERTO_HTTPS}`);
  const local = nombreLocal();
  if (local) console.log(`     https://${local}:${PUERTO_HTTPS}`);
  console.log("   La primera vez el navegador avisará que la conexión no es privada: acepta y continúa.");
  console.log(`   (Opcional, para quitar el aviso: instala https://${ips[0] ?? "localhost"}:${PUERTO_HTTPS}/certificado-inventario.crt)\n`);
});
