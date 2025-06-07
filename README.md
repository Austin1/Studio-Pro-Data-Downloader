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

### 5. Run the Script

```bash
node index.js
```

You’ll see a browser window open, which logs into Studio Pro and navigates to the class data page and downloads and generates a class-data-{date}.json file with an extract of all your class data.