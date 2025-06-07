require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const context = browser.defaultBrowserContext();
  const page = await context.newPage();

  const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8'));
  await page.setCookie(...cookies);

  // Function to check if we're logged in and refresh cookies if needed
  const ensureLoggedIn = async () => {
    console.log('🔐 Checking login status...');
    
    await page.goto('https://app.gostudiopro.com/apps/classes.php', {
      waitUntil: 'networkidle2',
    });

    // Check if we're redirected to login page or see login elements
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('index.php') || currentUrl.includes('login');
    
    if (isLoginPage) {
      console.log('🔄 Session expired, refreshing cookies...');
      
      // Navigate to login page to refresh session
      await page.goto('https://app.gostudiopro.com/apps/index.php', {
        waitUntil: 'networkidle2',
      });
      
      // Wait for user to manually login (since we don't have credentials)
      console.log('⚠️ Please log in manually in the browser window...');
      console.log('💡 After logging in, the script will automatically continue');
      
      // Wait until we're redirected away from login page
      await page.waitForFunction(() => {
        return !window.location.href.includes('index.php') && 
               (window.location.href.includes('classes.php') || 
                window.location.href.includes('dashboard') ||
                document.querySelector('#season_tabs'));
      }, { timeout: 300000 }); // 5 minute timeout for manual login
      
      // Extract and save new cookies
      const newCookies = await page.cookies();
      const filteredCookies = newCookies.filter(cookie => 
        cookie.name === 'PHPSESSID' || 
        cookie.name.includes('session') || 
        cookie.name.includes('auth')
      );
      
      fs.writeFileSync('cookies.json', JSON.stringify(filteredCookies, null, 2));
      console.log('✅ Cookies refreshed and saved');
      
      // Navigate back to classes page
      await page.goto('https://app.gostudiopro.com/apps/classes.php', {
        waitUntil: 'networkidle2',
      });
    } else {
      console.log('✅ Already logged in');
    }
  };

  await ensureLoggedIn();

  console.log('⏳ Waiting for UserCentrics modal...');
  
  // Wait for the modal to appear and handle it (inside shadow DOM)
  try {
    // Wait for the shadow host to appear
    await page.waitForSelector('#usercentrics-root', { timeout: 10000 });
    
    // Wait for shadow DOM content to load and click accept button
    const acceptClicked = await page.evaluate(() => {
      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        const checkForButton = () => {
          attempts++;
          const shadowHost = document.querySelector('#usercentrics-root');
          
          if (shadowHost && shadowHost.shadowRoot) {
            const acceptButton = shadowHost.shadowRoot.querySelector('[data-testid="uc-accept-all-button"]');
            if (acceptButton) {
              acceptButton.click();
              resolve(true);
              return;
            }
          }
          
          if (attempts < maxAttempts) {
            setTimeout(checkForButton, 100);
          } else {
            resolve(false);
          }
        };
        
        checkForButton();
      });
    });
    
    if (acceptClicked) {
      console.log('✅ Accepted UserCentrics privacy modal');
      // Wait a moment for the modal to disappear
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('⚠️ Accept button not found in shadow DOM after waiting');
    }
  } catch (err) {
    console.log('⚠️ UserCentrics modal not found or already dismissed');
  }

  try {
    await page.waitForSelector('#season_tabs', { timeout: 5000 });
    console.log('🎉 Logged in using session cookies!');
  } catch (err) {
    console.error('❌ Login failed — session may be expired. Please re-export cookies.');
  }

  console.log('🔍 Scanning for class links in all tab-panes...');
  
  // Extract all class URLs from all tab-panes
  const classUrls = await page.evaluate(() => {
    const tabPanes = document.querySelectorAll('.tab-pane');
    const urls = [];
    
    tabPanes.forEach(pane => {
      const links = pane.querySelectorAll('a[href*="class_detail.php"]');
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !urls.includes(href)) {
          urls.push(href);
        }
      });
    });
    
    return urls;
  });
  
  console.log(`📋 Found ${classUrls.length} unique classes to process`);
  
  const classData = [];
  
  for (let i = 0; i < classUrls.length; i++) {
    const classUrl = classUrls[i];
    console.log(`📖 Processing class ${i + 1}/${classUrls.length}: ${classUrl}`);
    
    try {
      await page.goto(`https://app.gostudiopro.com/apps/${classUrl}`, {
        waitUntil: 'networkidle2',
      });
      
      // Check if we got redirected to login page (session expired)
      const currentUrl = page.url();
      if (currentUrl.includes('index.php') || currentUrl.includes('login')) {
        console.log('🔄 Session expired during processing, refreshing...');
        await ensureLoggedIn();
        
        // Retry the current class URL
        await page.goto(`https://app.gostudiopro.com/apps/${classUrl}`, {
          waitUntil: 'networkidle2',
        });
      }
      
      // Extract class data from the detail page
      const data = await page.evaluate(() => {
        const getValue = (selector) => {
          const element = document.querySelector(selector);
          return element ? element.value || element.textContent.trim() : '';
        };
        
        const getSelectedOption = (selector) => {
          const select = document.querySelector(selector);
          if (!select) return '';
          
          // First try to find option with selected attribute
          let selected = select.querySelector('option[selected]');
          
          // If not found, try looking for option with selected=""
          if (!selected) {
            const options = select.querySelectorAll('option');
            for (const option of options) {
              if (option.hasAttribute('selected')) {
                selected = option;
                break;
              }
            }
          }
          
          // If still not found, use the selectedIndex property
          if (!selected && select.selectedIndex >= 0) {
            selected = select.options[select.selectedIndex];
          }
          
          return selected ? selected.textContent.trim() : '';
        };
        
        const isChecked = (selector) => {
          const element = document.querySelector(selector);
          return element ? element.checked : false;
        };
        
        const getClassDays = () => {
          const days = {
            monday: isChecked('input[name="class_mon"]'),
            tuesday: isChecked('input[name="class_tues"]'),
            wednesday: isChecked('input[name="class_wed"]'),
            thursday: isChecked('input[name="class_thurs"]'),
            friday: isChecked('input[name="class_fri"]'),
            saturday: isChecked('input[name="class_sat"]'),
            sunday: isChecked('input[name="class_sun"]')
          };
          return Object.keys(days).filter(day => days[day]);
        };
        
        const getStartDate = () => {
          const month = getSelectedOption('select[name="start_month"]');
          const day = getSelectedOption('select[name="start_day"]');
          const year = getSelectedOption('select[name="start_year"]');
          return month && day && year ? `${month} ${day}, ${year}` : '';
        };
        
        const getEndDate = () => {
          const month = getSelectedOption('select[name="end_month"]');
          const day = getSelectedOption('select[name="end_day"]');
          const year = getSelectedOption('select[name="end_year"]');
          return month && day && year ? `${month} ${day}, ${year}` : '';
        };
        
        const getStartTime = () => {
          const hours = getSelectedOption('select[name="start_time_hours"]');
          const mins = getSelectedOption('select[name="start_time_mins"]');
          const ampm = getSelectedOption('select[name="start_time_ampm"]');
          return hours && mins && ampm ? `${hours}:${mins} ${ampm}` : '';
        };
        
        const getEndTime = () => {
          const hours = getSelectedOption('select[name="end_time_hours"]');
          const mins = getSelectedOption('select[name="end_time_mins"]');
          const ampm = getSelectedOption('select[name="end_time_ampm"]');
          return hours && mins && ampm ? `${hours}:${mins} ${ampm}` : '';
        };
        
        return {
          className: getValue('input[name="class_name"]'),
          location: getSelectedOption('select[name="location"]'),
          room: getSelectedOption('select[name="room"]'),
          season: getSelectedOption('select[name="season_id"]'),
          active: isChecked('input[name="active"]'),
          recital: isChecked('input[name="recital"]'),
          classDays: getClassDays(),
          tuition: getValue('input[name="tuition"]'),
          billSeparately: isChecked('input[name="bill"]'),
          allowRegistrationOnline: isChecked('input[name="online"]'),
          classRegistrationFee: getValue('input[name="registration_fee"]'),
          onlineClassDescription: getValue('textarea[name="description"]'),
          ignoreRegistrationFee: isChecked('input[name="ignore_reg_fee"]'),
          startDate: getStartDate(),
          endDate: getEndDate(),
          gender: getSelectedOption('select[name="gender"]'),
          minAge: getSelectedOption('select[name="min_age"]'),
          maxAge: getSelectedOption('select[name="max_age"]'),
          startTime: getStartTime(),
          endTime: getEndTime(),
          maxStudents: getValue('input[name="max_students"]'),
          hideOnLiveSchedule: isChecked('input[name="hide_live_schedule"]'),
          url: window.location.href,
          lastUpdated: new Date().toISOString()
        };
      });
      
      classData.push(data);
      console.log(`✅ Extracted data for: ${data.className || 'Untitled Class'}`);
      
    } catch (err) {
      console.error(`❌ Error processing ${classUrl}:`, err.message);
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Save the extracted data to single JSON file with version history
  const filename = 'class-data.json';
  
  let shouldSave = true;
  let existingData = [];
  let dataHistory = [];
  
  if (fs.existsSync(filename)) {
    console.log(`📄 Found existing file: ${filename}`);
    try {
      const fileContent = JSON.parse(fs.readFileSync(filename, 'utf-8'));
      
      // Handle both old format (array) and new format (object with history)
      if (Array.isArray(fileContent)) {
        // Convert old format to new format
        existingData = fileContent;
        dataHistory = [{
          timestamp: new Date().toISOString(),
          data: existingData
        }];
      } else {
        // New format with history
        dataHistory = fileContent.history || [];
        existingData = dataHistory.length > 0 ? dataHistory[dataHistory.length - 1].data : [];
      }
      
      // Compare the data structures (excluding URL and lastUpdated which might change)
      const normalizeData = (data) => data.map(item => {
        const { url, lastUpdated, ...rest } = item;
        return rest;
      });
      
      const normalizedExisting = normalizeData(existingData);
      const normalizedNew = normalizeData(classData);
      
      // Deep comparison
      if (JSON.stringify(normalizedExisting) === JSON.stringify(normalizedNew)) {
        shouldSave = false;
        console.log(`✅ No changes detected - existing file is up to date`);
      } else {
        console.log(`🔄 Changes detected in class data`);
        
        // Log what changed for debugging
        if (normalizedExisting.length !== normalizedNew.length) {
          console.log(`📊 Class count changed: ${normalizedExisting.length} → ${normalizedNew.length}`);
        } else {
          // Find specific changes
          for (let i = 0; i < normalizedNew.length; i++) {
            if (JSON.stringify(normalizedExisting[i]) !== JSON.stringify(normalizedNew[i])) {
              console.log(`📝 Changes detected in class: ${normalizedNew[i].className || 'Unknown'}`);
            }
          }
        }
      }
    } catch (err) {
      console.log(`⚠️ Error reading existing file, will create new: ${err.message}`);
      shouldSave = true;
      dataHistory = [];
    }
  } else {
    console.log(`📝 Creating new file: ${filename}`);
    dataHistory = [];
  }
  
  if (shouldSave) {
    // Add new data to history
    dataHistory.push({
      timestamp: new Date().toISOString(),
      extractionDate: new Date().toISOString().split('T')[0],
      classCount: classData.length,
      data: classData
    });
    
    // Keep only last 10 versions to prevent file from growing too large
    if (dataHistory.length > 10) {
      dataHistory = dataHistory.slice(-10);
    }
    
    const outputData = {
      lastUpdated: new Date().toISOString(),
      totalVersions: dataHistory.length,
      currentData: classData,
      history: dataHistory
    };
    
    fs.writeFileSync(filename, JSON.stringify(outputData, null, 2));
    console.log(`💾 Saved ${classData.length} classes to ${filename} (version ${dataHistory.length})`);
  } else {
    console.log(`⏭️ Skipped saving - no changes detected`);
  }

  // await browser.close();
})();