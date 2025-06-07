# Studio Pro Downloader

This project automates downloading class data from Studio Pro using Puppeteer.

## 🔧 Setup Instructions
### Prerequisites
1. Install Github Desktop from https://desktop.github.com
2. Install VS Code from https://code.visualstudio.com/

### 1. Clone the Repository with GitHub Desktop
1. Open **GitHub Desktop**.
2. Click **"File" > "Clone Repository..."**.
3. Select the **"URL"** tab and paste this repo URL.
4. Choose a local folder and click **Clone**.

### 2. Open the Project in VS Code
1. After cloning, click **"Open in Visual Studio Code"** from GitHub Desktop.
   - Or open **VS Code**, then **File > Open Folder...** and select the cloned folder.

### 📦 Install Node.js with NVM (Optional but Recommended)

Using Node Version Manager (NVM) lets you manage multiple versions of Node.js on your system.

#### macOS

1. Open Terminal and install NVM:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   ```

2. Close and reopen Terminal, then verify installation:
   ```bash
   command -v nvm
   ```

3. Install Node.js (LTS version):
   ```bash
   nvm install --lts
   ```

#### Windows

1. Download and install **nvm-windows** from the official repo:
   👉 https://github.com/coreybutler/nvm-windows/releases

2. After installation, open Command Prompt or PowerShell and run:
   ```cmd
   nvm install lts
   nvm use lts
   ```

3. Verify Node and npm:
   ```cmd
   node -v
   npm -v
   ```

Now you're ready to install project dependencies and run the script!


### 3. Install Dependencies
In VS Code, open the terminal:
- Go to **Terminal > New Terminal**
- Run:

```bash
npm install
```

### 4. Configure Environment Variables
1. Create a file named `.env` in the root of the project.
2. Add the following lines:

```
EMAIL=your@email.com
PASSWORD=yourpassword
```

Replace with your actual Studio Pro login credentials.

### 5. Obtain a Cookie for automation
1. I'd like to replace this and automate it, but I haven't found a good way to do this yet. So for now, you have to manually obtain a cookie to login. Otherwise you have to login via the chrome test env that popsup when the script run. Eventually I want this to run headless and handle cookie and login, but requires bypassing 2FA and RECAPTCHA which is a bit complicated.
2. 🔐 How to Get Your PHPSESSID from Chrome

If you want to bypass login and 2FA in the script, you can extract your session cookie (PHPSESSID) from Chrome.

Steps:
	1.	Open https://app.gostudiopro.com and log in as normal.
	2.	Press F12 or Ctrl+Shift+I (Windows) / Cmd+Option+I (Mac) to open DevTools.
	3.	Go to the Application tab.
	4.	In the left sidebar, expand Cookies and click on https://app.gostudiopro.com.
	5.	Look for a cookie named PHPSESSID.
	6.	Copy the Value — it looks like:

cc9ae5f947e36ecb2cdeff3a3c7058c2



Save it for the Script

Create a file named cookies.json in your project folder (see cookies.json.sample; which can be renamed to remove .sample):

[
  {
    "name": "PHPSESSID",
    "value": "your-session-id-goes-here",
    "domain": "app.gostudiopro.com",
    "path": "/",
    "httpOnly": true,
    "secure": true
  }
]

This lets Puppeteer authenticate using your existing browser session — no login or 2FA needed.


### 6. Run the Script

```bash
node index.js
```

You’ll see a browser window open, which logs into Studio Pro and navigates to the class data page and downloads and generates a class-data-{date}.json file with an extract of all your class data.