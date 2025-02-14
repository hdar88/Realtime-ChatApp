#!/usr/bin/env node

import app from "../src/server.js";
import debug from "debug";
import http from "http";

const debugLog = debug("server:server");

/**
 * Retrieves the port from the environment variables and ensures it is a valid number.
 *
 * @param {string} val - The port value from the environment.
 * @returns {number|string|boolean} - A normalized port number, a named pipe, or false if invalid.
 */
function normalizePort(val) {
    const port = parseInt(val, 10);
    if (isNaN(port)) return val;
    if (port >= 0) return port;
    return false;
}

/** The port on which the server will listen. */
const port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

/** Creates an HTTP server instance using the Express app. */
const server = http.createServer(app);

/** Starts the server and attaches event listeners. */
server.listen(port);
server.on("error", onError);
server.on("listening", onListening);

/**
 * Handles HTTP server errors.
 *
 * @param {NodeJS.ErrnoException} error - The error object.
 */
function onError(error) {
    if (error.syscall !== "listen") throw error;
    const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;
    switch (error.code) {
        case "EACCES":
            console.error(bind + " requires elevated privileges");
            process.exit(1);
            break;
        case "EADDRINUSE":
            console.error(bind + " is already in use");
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for the HTTP server's "listening" event.
 * Logs the address and port on which the server is listening.
 */
function onListening() {
    const addr = server.address();
    const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
    debugLog(`Listening on ${bind}`);
}