# HermitClaw & OpenClaw Mac Setup Guide

Welcome! This guide will walk you through setting up HermitClaw and OpenClaw on your Mac. We'll go step-by-step, and no previous experience with the terminal is required. We'll explain what each command does as we go.

## Who is this for?

This guide is for anyone new to this kind of software, like Sacha (who's 14) or Thomas (who's a project manager and doesn't usually mess with code). If you've never used the terminal before, you're in the right place!

## What are we installing?

*   **HermitClaw:** A cool AI agent project.
*   **OpenClaw:** The platform that HermitClaw runs on.
*   **Homebrew:** A package manager for Mac. Think of it like an App Store for developers.
*   **Node.js:** A runtime environment for JavaScript, which OpenClaw is built on.
*   **PostgreSQL:** A database to store information.

---

## Step 1: Open Your Terminal

The terminal is an application on your Mac that lets you run commands directly. It's a powerful tool, and we'll be using it a lot today.

You can find it in `Applications -> Utilities -> Terminal`. Open it up, and you'll see a window with a blinking cursor. You're ready for the next step!

---

## Step 2: Install Homebrew

Homebrew is a package manager that makes it easy to install developer tools on your Mac.

**What this command does:**
This command downloads and runs the Homebrew installer. It will ask for your password, because it needs permission to install software on your computer.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After running this, Homebrew will be installed. It might take a few minutes.

---

## Step 3: Install Node.js

Node.js is what OpenClaw uses to run. We'll use Homebrew to install it.

**What this command does:**
This tells Homebrew to install the latest version of Node.js.

```bash
brew install node
```

---

## Step 4: Install PostgreSQL

PostgreSQL is the database we'll use to store information.

**What this command does:**
First, we tell Homebrew to install PostgreSQL. Then, we start it up as a service that runs in the background.

```bash
brew install postgresql
brew services start postgresql
```

---

## Step 5: Install OpenClaw

Now we'll install OpenClaw itself. We'll use `npm`, which is the Node Package Manager and was installed with Node.js.

**What this command does:**
This command tells `npm` to install OpenClaw globally on your system, so you can run it from anywhere.

```bash
npm install -g @openclaw/cli
```

---

## Step 6: Clone and Set Up HermitClaw

Now we're going to download the HermitClaw project from GitHub and get it ready to run.

**What these commands do:**
1.  `git clone` downloads the HermitClaw project into a new folder called `hermitclaw`.
2.  `cd hermitclaw` moves you into that new folder.
3.  `npm install` installs all the specific packages that HermitClaw needs to run.

```bash
git clone https://github.com/your-username/hermitclaw.git
cd hermitclaw
npm install
```
*(Note: Replace `your-username` with the correct GitHub username if you have a fork, otherwise use the main project URL)*

---

## Step 7: First Run!

You're all set up! Let's start OpenClaw for the first time.

**What this command does:**
This starts the OpenClaw gateway, which is the main process that runs in the background.

```bash
openclaw gateway start
```

You should see a message that the gateway has started successfully.

---

## Troubleshooting

*   **`command not found: brew`**: This means Homebrew didn't install correctly. Try running the installation command again.
*   **`command not found: npm`** or **`command not found: node`**: This means Node.js didn't install correctly. Try `brew install node` again.
*   **`EACCES` permissions errors during `npm install -g`**: This means `npm` doesn't have the right permissions to install things globally. You can fix this by either running the command with `sudo` (`sudo npm install -g @openclaw/cli`), or by changing the ownership of the `npm` directories. For beginners, using `sudo` is easier, but be aware it gives the command root access.

---

That's it! You're ready to start using HermitClaw and OpenClaw. If you have any problems, don't hesitate to ask for help.
