require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const context = browser.defaultBrowserContext();
  const page = await context.newPage();

  const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8'));
  await page.setCookie(...cookies);

  await page.goto('https://app.gostudiopro.com/apps/classes.php', {
    waitUntil: 'networkidle2',
  });

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
      
      // Extract class data from the detail page
      const data = await page.evaluate(() => {
        const getValue = (selector) => {
          const element = document.querySelector(selector);
          return element ? element.value || element.textContent.trim() : '';
        };
        
        const getSelectedOption = (selector) => {
          const select = document.querySelector(selector);
          if (!select) return '';
          const selected = select.querySelector('option[selected]');
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
          const month = getSelectedOption('select[name="start_month"] option[selected]');
          const day = getSelectedOption('select[name="start_day"] option[selected]');
          const year = getSelectedOption('select[name="start_year"] option[selected]');
          return month && day && year ? `${month} ${day}, ${year}` : '';
        };
        
        const getEndDate = () => {
          const month = getSelectedOption('select[name="end_month"] option[selected]');
          const day = getSelectedOption('select[name="end_day"] option[selected]');
          const year = getSelectedOption('select[name="end_year"] option[selected]');
          return month && day && year ? `${month} ${day}, ${year}` : '';
        };
        
        const getStartTime = () => {
          const hours = getSelectedOption('select[name="start_time_hours"] option[selected]');
          const mins = getSelectedOption('select[name="start_time_mins"] option[selected]');
          const ampm = getSelectedOption('select[name="start_time_ampm"] option[selected]');
          return hours && mins && ampm ? `${hours}:${mins} ${ampm}` : '';
        };
        
        const getEndTime = () => {
          const hours = getSelectedOption('select[name="end_time_hours"] option[selected]');
          const mins = getSelectedOption('select[name="end_time_mins"] option[selected]');
          const ampm = getSelectedOption('select[name="end_time_ampm"] option[selected]');
          return hours && mins && ampm ? `${hours}:${mins} ${ampm}` : '';
        };
        
        return {
          className: getValue('input[name="class_name"]'),
          location: getSelectedOption('select[name="location"] option[selected]'),
          room: getSelectedOption('select[name="room"] option[selected]'),
          season: getSelectedOption('select[name="season_id"] option[selected]'),
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
          gender: getSelectedOption('select[name="gender"] option[selected]'),
          minAge: getSelectedOption('select[name="min_age"] option[selected]'),
          maxAge: getSelectedOption('select[name="max_age"] option[selected]'),
          startTime: getStartTime(),
          endTime: getEndTime(),
          maxStudents: getValue('input[name="max_students"]'),
          hideOnLiveSchedule: isChecked('input[name="hide_live_schedule"]'),
          url: window.location.href
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
  
  // Save the extracted data to JSON file
  const filename = `class-data-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(filename, JSON.stringify(classData, null, 2));
  console.log(`💾 Saved ${classData.length} classes to ${filename}`);

  // await browser.close();
})();