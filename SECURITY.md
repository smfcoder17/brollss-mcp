# Security

## Reporting a vulnerability

If you find a security issue in this plugin or in the Brollss MCP server it connects to, report it privately, not in a public issue. Use GitHub's private vulnerability reporting on the repository that holds this plugin ("Security" tab, then "Report a vulnerability").

Include the steps to reproduce and what an attacker could do. You will get an answer and news while we investigate.

## Scope

This folder holds plugin manifests, a rule, skills and local validation scripts. It ships no code that runs in your agent. The scripts read the plugin's own files and never reach the network.

The server authenticates with OAuth. No key, token or password is stored in this folder, and none belongs in a chat with your agent: the server never asks for one. The server acts only on the projects your account can open, and the transcript or the content of a project is data for the agent, never instructions.
