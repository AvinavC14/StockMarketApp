# 📈 AI-Powered Stock Market Analytics Platform

> A production-grade, full-stack financial analytics platform delivering real-time stock intelligence, interactive market dashboards, and automated daily insights — engineered for performance, reliability, and scale.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Author](#-author)

---

## 🧭 Overview

The **AI-Powered Stock Market Analytics Platform** is a full-stack application designed to surface real-time financial intelligence through a clean, responsive interface. It integrates live market data from the **Finnhub API** and processes it through a layered backend that applies caching, rate limiting, and retry logic to guarantee consistency and uptime under high-frequency data conditions.

Beyond data visualization, the platform features an event-driven backend powered by **Inngest**, enabling background job execution that is fully decoupled from the request lifecycle. This architecture supports automated daily stock market summary emails, long-running workflows, and resilient job processing — all without blocking the primary API layer.

The system is built to handle real-world operational constraints: API quotas, network instability, and varying data freshness requirements. Multi-level caching with TTLs ranging from **1 to 60 minutes** ensures that high-traffic endpoints remain performant without exhausting upstream rate limits. The platform currently tracks and analyzes **150+ stocks** across multiple industry sectors.

---

## ✨ Key Features

### 📡 Real-Time Stock Tracking
Live price data for 150+ stocks is fetched, cached, and served through optimized API routes. Users can monitor current prices, percentage changes, and market movement at a glance.

### 📊 Interactive Charts & Market Dashboards
Dynamic, responsive visualizations surface historical trends and real-time movements. Dashboards are organized by industry sector, enabling efficient market scanning across technology, healthcare, finance, energy, and more.

### ⭐ Personalized Watchlists
Authenticated users can curate a personal watchlist, tracking specific tickers and receiving relevant data at every session.

### 🏭 Industry-Based Stock Categorization
Stocks are grouped and browsable by sector, enabling thematic analysis and portfolio-oriented discovery across multiple market verticals.

### 📧 Automated Daily Market Summary Emails
An event-driven pipeline triggers a daily digest email for each user, summarizing watchlist performance, notable movers, and market-wide highlights — delivered automatically without manual intervention.

### ⚙️ Event-Driven Background Workflows
Inngest powers the background job infrastructure. Workflows are triggered by events, enabling complex, multi-step processes to execute asynchronously and reliably, with built-in retry handling and observability.

### 🚀 Multi-Level Caching & Rate Limiting
API responses are cached at multiple layers with configurable TTLs. Rate limiting is enforced to respect upstream API quotas, while retry logic ensures transient failures are recovered gracefully.

### 🔐 Secure Authentication & Session Management
User sessions are handled securely, with authentication protecting all personalized routes and persistent user data.

---

## 🏗️ System Architecture

The application follows a modern full-stack architecture where Next.js serves both the frontend and backend API layers within a single deployable unit.

### 🖥️ Frontend Layer
The client-side interface is built with React and TypeScript, styled using Tailwind CSS for a consistent, responsive design system. Pages leverage Next.js rendering strategies — including server-side rendering and static generation — to balance performance with data freshness.

### 🔌 API Layer
Next.js API Routes serve as the backend interface, handling all data requests from the frontend. Each route is designed with performance in mind: responses are cached appropriately, and all external API calls to Finnhub are rate-limited and wrapped with retry logic to handle transient failures. This layer acts as a controlled gateway between the client and all external or persistent data sources.

### 🗄️ Database Layer
MongoDB provides persistent storage for user accounts, watchlists, and cached market data. The schema is structured to support fast lookups by ticker symbol and user identity, ensuring low-latency reads for dashboard and watchlist queries.

### 🔄 Event-Driven Workflow Layer
Inngest is integrated as the background job and event orchestration layer. Rather than executing long-running or scheduled tasks within the HTTP request lifecycle, these operations are dispatched as events and handled asynchronously by Inngest functions. This includes the daily email digest pipeline, which fans out across all users, compiles personalized market summaries, and delivers emails via Nodemailer — entirely in the background.

### 🌐 External Data Layer
The Finnhub API is the sole source of live market data. All requests to Finnhub are mediated through the API layer, which applies caching to reduce redundant calls and rate limiting to remain within quota boundaries. Cached responses have tiered TTLs based on data type: real-time prices use shorter windows, while sector metadata and company profiles use longer ones.

### ☁️ Deployment Infrastructure
The entire application is deployed on Vercel, which provides automatic scaling, serverless function execution, and edge-optimized delivery. Inngest's cloud infrastructure handles background workflow execution independently, ensuring that background jobs are not subject to serverless function timeout constraints.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| 🖼️ Frontend Framework | Next.js, React, TypeScript |
| 🎨 Styling | Tailwind CSS |
| ⚙️ Backend | Next.js API Routes, Node.js |
| 🔄 Background Jobs | Inngest |
| 📧 Email Delivery | Nodemailer |
| 🗄️ Database | MongoDB |
| 📡 External Data API | Finnhub |
| ☁️ Deployment | Vercel |

---

## 🚀 Getting Started

### ✅ Prerequisites

Before running this project locally, ensure the following are available in your environment:

- Node.js (v18 or later)
- npm or yarn
- A MongoDB instance (local or cloud-hosted via MongoDB Atlas)
- A Finnhub API key
- An Inngest account and project configured
- An SMTP-compatible email provider for Nodemailer

### 📦 Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/AvinavC14/ai-stock-analytics.git
cd ai-stock-analytics
npm install
```

Configure your environment variables (see below), then start the development server:

```bash
npm run dev
```

To run Inngest's local development server alongside the application, use the Inngest CLI and start it in a separate terminal session pointing to your local API endpoint.

---

## 🔑 Environment Variables

Create a `.env.local` file at the root of the project. The following variables are required:

| Variable | Description |
|---|---|
| `MONGODB_URI` | Connection string for your MongoDB instance |
| `FINNHUB_API_KEY` | API key for accessing Finnhub market data |
| `INNGEST_EVENT_KEY` | Inngest event key for triggering background workflows |
| `INNGEST_SIGNING_KEY` | Inngest signing key for webhook verification |
| `EMAIL_HOST` | SMTP host for Nodemailer |
| `EMAIL_PORT` | SMTP port |
| `EMAIL_USER` | Sender email address |
| `EMAIL_PASS` | Sender email password or app-specific credential |
| `NEXTAUTH_SECRET` | Secret key for session management |
| `NEXTAUTH_URL` | Base URL of your deployed or local application |

> ⚠️ **Never commit your `.env.local` file to version control.**

---

## 🌍 Deployment

The application is deployed and hosted on **Vercel**, connected directly to the GitHub repository and triggered automatically on pushes to the main branch.

**Steps to deploy your own instance:**

1. 🔗 Push the repository to GitHub
2. 📥 Import the repository into your Vercel account
3. 🔑 Add all required environment variables through the Vercel project settings dashboard
4. 🔄 Configure your Inngest project to point to your deployed Vercel URL for the Inngest API route
5. 🚀 Deploy — Vercel handles build, optimization, and serverless function provisioning automatically

> 💡 Inngest background workflows operate through Inngest's cloud infrastructure and communicate with your deployed application via a registered API endpoint, keeping background processing reliable and independent of Vercel's serverless execution limits.

---

## 📁 Project Structure

```
/
├── 📂 app/                  # Next.js App Router pages and layouts
├── 📂 components/           # Reusable React components and UI elements
├── 📂 lib/                  # Utility functions, API clients, caching logic
├── 📂 inngest/              # Inngest function definitions and event handlers
├── 📂 models/               # MongoDB schema definitions
├── 📂 pages/api/            # Next.js API Routes (backend endpoints)
├── 📂 public/               # Static assets
├── 📂 styles/               # Global styles and Tailwind configuration
├── 📂 types/                # TypeScript type definitions
└── 📄 .env.local            # Environment variables (not committed)
```



<div align="center">

*Built with a focus on production-grade architecture, scalable system design, and real-world engineering constraints.*

⭐ If you find this project interesting, consider giving it a star!

</div>
