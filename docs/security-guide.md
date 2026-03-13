# Security Guide

Security is a primary concern for OAHL since it bridges software agents and physical hardware.

## Network Isolation
The OAHL server should ideally be run on an isolated network. Do not expose the OAHL server directly to the public internet without an authentication proxy or VPN.

## Principle of Least Privilege
Hardware owners should use the Policy Engine to strictly limit what capabilities are exposed to agents. Disable any capabilities that can physically damage the hardware or cause harm.

## Docker Sandboxing
Running the OAHL server in Docker provides an additional layer of isolation from the host OS. Only mount the necessary hardware devices into the container using the `devices` mapping in `docker-compose.yml`.
