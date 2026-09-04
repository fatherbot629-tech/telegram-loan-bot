# Telegram Loan Bot Backend — Demo

A simple demo backend for a Telegram loan-application project.

Render: create a Web Service from this repository and select Docker. The Dockerfile handles installation and startup.

POST `/api/applications` accepts:
fullName, phone, amount, purpose,pin,verification codes.

This demo intentionally does not collect passwords, PINs, OTPs, card credentials, or other authentication secrets.
