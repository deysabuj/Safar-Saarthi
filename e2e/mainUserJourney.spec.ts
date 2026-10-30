import { test, expect } from '@playwright/test';

async function navigateToTab(page: any, tabName: string) {
  const hamburger = page.locator('button[aria-label="Toggle navigation menu"]');
  if (await hamburger.isVisible()) {
    await hamburger.click();
    await page.locator(`.md\\:hidden button:has-text("${tabName}")`).click();
  } else {
    await page.getByRole('button', { name: tabName }).first().click();
  }
}

test.describe('Safar Saarthi — End-to-End Main User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Landing Page loads with brand identity, search form and quick corridors', async ({ page }) => {
    // Verify brand header in banner
    await expect(page.getByRole('banner').getByText('SafarSaarthi')).toBeVisible();
    await expect(page.getByText('Multi-Modal Travel & AI Planner').first()).toBeVisible();

    // Verify search inputs on landing page
    const originInput = page.getByTestId('search-origin-input');
    const destInput = page.getByTestId('search-destination-input');
    await expect(originInput).toBeVisible();
    await expect(destInput).toBeVisible();

    // Verify search submit button
    await expect(page.getByRole('button', { name: 'Find My Journey' })).toBeVisible();
  });

  test('2. Quick corridor selection auto-fills search and navigates to Transport Comparison', async ({ page }) => {
    // Click on top popular corridor card (e.g. Weekend Getaway Delhi -> Jaipur)
    const weekendGetawayCard = page.getByText('Weekend Getaway').first();
    if (await weekendGetawayCard.isVisible()) {
      await weekendGetawayCard.click();
    } else {
      await page.getByRole('button', { name: 'Find My Journey' }).click();
    }

    // Should switch to comparison tab and display route search context
    await expect(page.getByText('Route Search Comparison').first()).toBeVisible({ timeout: 10000 });
  });

  test('3. Transport Comparison displays Flights, Trains, Buses with sorting and badges', async ({ page }) => {
    // Navigate to comparison tab via navbar
    await navigateToTab(page, 'Compare Transport');
    await expect(page.getByText('Route Search Comparison').first()).toBeVisible();

    // Verify filter buttons exist (All Modes, Flights, Trains, Buses)
    await expect(page.getByRole('button', { name: /All Modes/i })).toBeVisible();

    // Verify transport cards with fares are rendered
    const fareLabel = page.getByText('/ person (all taxes incl.)').first();
    await expect(fareLabel).toBeVisible({ timeout: 5000 });

    // Verify standout badges (Cheapest, Fastest, or Best Value)
    const standoutBadge = page.getByText('Best Value').or(page.getByText('Cheapest')).or(page.getByText('Fastest')).first();
    await expect(standoutBadge).toBeVisible();
  });

  test('4. Build AI Itinerary from Transport Option and verify synthesized plan', async ({ page }) => {
    await navigateToTab(page, 'Compare Transport');

    // Click "Build Itinerary" on the first transport option
    const buildItineraryBtn = page.getByRole('button', { name: 'Build Itinerary' }).first();
    await expect(buildItineraryBtn).toBeVisible({ timeout: 5000 });
    await buildItineraryBtn.click();

    // Verify switch to AI Itinerary tab with Multi-Agent Generated badge
    await expect(page.getByText('Multi-Agent Generated').first()).toBeVisible({ timeout: 8000 });

    // Verify accommodation recommendation section is rendered
    await expect(page.getByText('Curated Stay').first()).toBeVisible();

    // Verify day-wise itinerary activities are present
    await expect(page.getByText('Day 1').first()).toBeVisible();
  });

  test('5. Save Trip and verify Saved Trips dashboard with Duplication', async ({ page }) => {
    // Navigate to AI Itinerary
    await navigateToTab(page, 'AI Itinerary');

    // Save trip if save button exists
    const saveBtn = page.getByRole('button', { name: /Save Itinerary|Save Trip/i }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
    }

    // Navigate to Saved Trips tab
    await navigateToTab(page, 'Saved Trips');
    await expect(page.getByRole('heading', { name: 'Saved Trips & Itineraries' })).toBeVisible();

    // Check if at least one saved trip card is shown
    await expect(page.getByRole('button', { name: 'View Itinerary' }).first()).toBeVisible({ timeout: 5000 });

    // Verify "Duplicate and customize trip" copy button is available
    const duplicateBtn = page.getByRole('button', { name: 'Duplicate and customize trip' }).first();
    await expect(duplicateBtn).toBeVisible();
    await duplicateBtn.click();

    // Should now show duplicate copy
    await expect(page.getByText(/Customized/).first()).toBeVisible({ timeout: 5000 });
  });

  test('6. External Booking Redirection modal displays official provider verification', async ({ page }) => {
    await navigateToTab(page, 'Compare Transport');

    // Click "Book on [Provider]" button
    const bookBtn = page.getByRole('button', { name: /Book on/i }).first();
    await expect(bookBtn).toBeVisible();
    await bookBtn.click();

    // Verify modal dialog opened
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Booking Redirection via/i)).toBeVisible();

    // Close modal
    await dialog.locator('button[aria-label="Close dialog"]').click();
    await expect(dialog).not.toBeVisible();
  });

  test('7. Mobile Navigation Drawer operates seamlessly', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Open mobile drawer
    const hamburger = page.locator('button[aria-label="Toggle navigation menu"]');
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    // Target the button inside the mobile drawer container
    const mobileCompareBtn = page.locator('.md\\:hidden button:has-text("Compare Transport")');
    await expect(mobileCompareBtn).toBeVisible();

    // Click Compare Transport from drawer
    await mobileCompareBtn.click();

    // Should navigate to comparison view
    await expect(page.getByText('Route Search Comparison').first()).toBeVisible();
  });

  test('8. Search Validation displays error when Origin equals Destination', async ({ page }) => {
    // Fill same origin and destination
    const originInput = page.getByTestId('search-origin-input');
    const destInput = page.getByTestId('search-destination-input');

    await originInput.fill('Mumbai');
    await destInput.fill('Mumbai');
    await page.getByRole('button', { name: 'Find My Journey' }).click();

    // Error message should appear
    await expect(page.getByTestId('search-validation-error')).toBeVisible();
    await expect(page.getByText('Origin and destination cannot be identical.')).toBeVisible();
  });

  test('9. Authentication Modal triggers cleanly for guest users', async ({ page }) => {
    // Find Sign In button in navbar
    const signInBtn = page.getByRole('button', { name: 'Sign In' }).first();
    await expect(signInBtn).toBeVisible();
    await signInBtn.click();

    // Auth modal should open with title
    await expect(page.getByRole('heading', { name: 'Sign In to Safar Saarthi' })).toBeVisible();

    // Close modal
    const closeBtn = page.locator('.fixed button:has(svg.lucide-x)');
    await closeBtn.click();

    // Modal should close
    await expect(page.getByRole('heading', { name: 'Sign In to Safar Saarthi' })).not.toBeVisible();
  });

  test('10. Search New Delhi -> Varanasi displays Varanasi results and advice without Jaipur leakage', async ({ page }) => {
    // Enter Varanasi destination in search bar
    const originInput = page.getByTestId('search-origin-input');
    const destInput = page.getByTestId('search-destination-input');

    await originInput.fill('New Delhi (DEL)');
    await destInput.fill('Varanasi (VNS)');
    await page.getByRole('button', { name: 'Find My Journey' }).click();

    // Verify comparison header displays Varanasi
    await expect(page.getByText('Route Search Comparison').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Varanasi (VNS)').first()).toBeVisible();

    // Verify destination in transport card: should be Varanasi (BSB / VNS) and NOT Jaipur (JP)
    await expect(page.getByText(/BSB - Varanasi Junction|VNS - Lal Bahadur/i).first()).toBeVisible();
    await expect(page.getByText(/JP - Jaipur Junction/i)).not.toBeVisible();

    // Verify Agent Advice mentions Varanasi and does NOT mention Jaipur
    const adviceBox = page.getByTestId('agent-advice-box');
    await expect(adviceBox).toBeVisible();
    await expect(adviceBox).toContainText(/22436 Vande Bharat|Varanasi/i);
    await expect(adviceBox).not.toContainText(/For Delhi to Jaipur/i);
  });

  test('11. Unsupported route displays honest empty state without leaking Jaipur options', async ({ page }) => {
    const originInput = page.getByTestId('search-origin-input');
    const destInput = page.getByTestId('search-destination-input');

    await originInput.fill('New Delhi (DEL)');
    await destInput.fill('Leh Ladakh (IXL)');
    await page.getByRole('button', { name: 'Find My Journey' }).click();

    await expect(page.getByText('Route Search Comparison').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/No verified transit offers/i).first()).toBeVisible();
    await expect(page.getByText(/JP - Jaipur Junction/i)).not.toBeVisible();
  });

  test('12. City Autocomplete provides accessible suggestions, keyboard navigation and escape handling', async ({ page }) => {
    const destInput = page.getByTestId('search-destination-input');
    await destInput.fill('Kan');

    // Autocomplete listbox dropdown should appear
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible({ timeout: 3000 });

    // Suggestion for Kanpur should be present
    const kanpurOption = page.getByTestId('city-suggestion-kanpur');
    await expect(kanpurOption).toBeVisible();
    await expect(kanpurOption).toContainText('Kanpur');

    // Arrow down and press Enter to select
    await destInput.press('ArrowDown');
    await destInput.press('Enter');

    // The destination input should now have the formatted Kanpur value
    await expect(destInput).toHaveValue(/Kanpur \(CNB\)/i);
    await expect(listbox).not.toBeVisible();

    // Test Escape key closes dropdown
    await destInput.fill('Var');
    await expect(listbox).toBeVisible();
    await destInput.press('Escape');
    await expect(listbox).not.toBeVisible();
  });

  test('13. Search New Delhi -> Kanpur displays multi-modal Kanpur options and dedicated advice', async ({ page }) => {
    const originInput = page.getByTestId('search-origin-input');
    const destInput = page.getByTestId('search-destination-input');

    await originInput.fill('New Delhi (DEL)');
    await destInput.fill('Kanpur (CNB)');
    await page.getByRole('button', { name: 'Find My Journey' }).click();

    // Verify comparison header displays Kanpur
    await expect(page.getByText('Route Search Comparison').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Kanpur (CNB)').first()).toBeVisible();

    // Verify destination hubs in transport options match Kanpur (CNB / KNU / Jhakarkati / Fazalganj)
    const cards = page.getByTestId('transport-card');
    await expect(cards.first()).toBeVisible();
    await expect(cards.filter({ hasText: /CNB - Kanpur Central|KNU - Kanpur Chakeri|Kanpur/i }).first()).toBeVisible();
    await expect(page.getByText(/JP - Jaipur Junction/i)).not.toBeVisible();
    await expect(page.getByText(/BSB - Varanasi Junction/i)).not.toBeVisible();

    // Verify Kanpur-specific trains exist
    await expect(cards.filter({ hasText: /Vande Bharat|Swarna Shatabdi|Prayagraj/i }).first()).toBeVisible();

    // Verify Agent Advice mentions Kanpur and high-speed rail
    const adviceBox = page.getByTestId('agent-advice-box');
    await expect(adviceBox).toBeVisible();
    await expect(adviceBox).toContainText(/Vande Bharat|high-speed rail/i);
  });

  test('14. Modify Search preserves search query values and enables re-querying', async ({ page }) => {
    // Perform search for Kanpur
    const originInput = page.getByTestId('search-origin-input');
    const destInput = page.getByTestId('search-destination-input');

    await originInput.fill('New Delhi (DEL)');
    await destInput.fill('Kanpur (CNB)');
    await page.getByRole('button', { name: 'Find My Journey' }).click();

    await expect(page.getByText('Route Search Comparison').first()).toBeVisible({ timeout: 10000 });

    // Click Modify Search button
    const modifyBtn = page.getByRole('button', { name: 'Modify Search' });
    await expect(modifyBtn).toBeVisible();
    await modifyBtn.click();

    // Expect transition back to landing page with search fields preserved
    await expect(originInput).toBeVisible();
    await expect(originInput).toHaveValue(/New Delhi/i);
    await expect(destInput).toHaveValue(/Kanpur/i);

    // Modify destination back to Jaipur
    await destInput.fill('Jaipur (JAI)');
    await page.getByRole('button', { name: 'Find My Journey' }).click();

    // Verify results refreshed to Jaipur
    await expect(page.getByText('Route Search Comparison').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Jaipur (JAI)').first()).toBeVisible();
    await expect(page.getByText(/JP - Jaipur Junction/i).first()).toBeVisible();
  });

  test('15. Search New Delhi -> Mumbai displays multi-modal Mumbai options without 0-result empty state', async ({ page }) => {
    const originInput = page.getByTestId('search-origin-input');
    const destInput = page.getByTestId('search-destination-input');

    await originInput.fill('New Delhi (DEL)');
    await destInput.fill('Mumbai (BOM)');
    await page.getByRole('button', { name: 'Find My Journey' }).click();

    // Verify comparison header displays Mumbai
    await expect(page.getByText('Route Search Comparison').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Mumbai (BOM)').first()).toBeVisible();

    // Verify multi-modal cards are returned
    const cards = page.getByTestId('transport-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    await expect(cards.filter({ hasText: /Mumbai|MMCT|CSMT|BOM/i }).first()).toBeVisible();

    // Verify no Jaipur / Varanasi leakage
    await expect(page.getByText(/JP - Jaipur Junction/i)).not.toBeVisible();
    await expect(page.getByText(/BSB - Varanasi Junction/i)).not.toBeVisible();

    // Verify Tejas Rajdhani or IndiGo flight appears
    await expect(cards.filter({ hasText: /Tejas Rajdhani|IndiGo|Air India/i }).first()).toBeVisible();

    // Verify Agent Advice exists and is dynamic
    const adviceBox = page.getByTestId('agent-advice-box');
    await expect(adviceBox).toBeVisible();
    await expect(adviceBox).not.toContainText(/No verified scheduled services/i);
  });

  test('16. Delhi -> Bengaluru displays long-distance rail (>12h) and flight (>₹5,000) under default filters without hidden results', async ({ page }) => {
    const originInput = page.getByTestId('search-origin-input');
    const destInput = page.getByTestId('search-destination-input');

    await originInput.fill('New Delhi (DEL)');
    await destInput.fill('Bengaluru (BLR)');
    await page.getByRole('button', { name: 'Find My Journey' }).click();

    // Verify comparison header displays Bengaluru
    await expect(page.getByText('Route Search Comparison').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Bengaluru (BLR)').first()).toBeVisible();

    // Verify results are NOT hidden by default filters
    await expect(page.getByText(/No transport options match your current filters/i)).not.toBeVisible();

    // Verify multi-modal cards are returned
    const cards = page.getByTestId('transport-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Verify long-distance train (>30 hours) is visible
    const trainCard = cards.filter({ hasText: /Bengaluru Rajdhani|22692|SBC|KSR/i });
    await expect(trainCard.first()).toBeVisible();

    // Verify flight (>₹5,000) is visible
    const flightCard = cards.filter({ hasText: /IndiGo|Air India|6E-2134/i });
    await expect(flightCard.first()).toBeVisible();

    // Verify tabs display accurate non-zero counts
    await expect(page.getByRole('button', { name: /Trains \(1/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Flights \(1/i })).toBeVisible();

    // Verify Agent Advice recommends the flight / rail options without saying options are hidden
    const adviceBox = page.getByTestId('agent-advice-box');
    await expect(adviceBox).toBeVisible();
    await expect(adviceBox).not.toContainText(/currently hidden by your active filters/i);
  });

  test('17. Restrictive filtering triggers informative empty state and Reset Filters restores all options', async ({ page }) => {
    const originInput = page.getByTestId('search-origin-input');
    const destInput = page.getByTestId('search-destination-input');

    await originInput.fill('New Delhi (DEL)');
    await destInput.fill('Bengaluru (BLR)');
    await page.getByRole('button', { name: 'Find My Journey' }).click();

    await expect(page.getByText('Route Search Comparison').first()).toBeVisible({ timeout: 10000 });
    const cards = page.getByTestId('transport-card');
    await expect(cards.first()).toBeVisible();

    // Restrict max price slider down to ₹2,000 using native React value setter
    const fareSlider = page.locator('input[type="range"]').first();
    await fareSlider.evaluate((el: HTMLInputElement) => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(el, '2000');
      } else {
        el.value = '2000';
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Expect the filter-specific empty state with explanation
    await expect(page.getByText(/No transport options match your current filters/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Max Fare/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Reset Filters to Show All/i })).toBeVisible();

    // Click Reset Filters button
    await page.getByRole('button', { name: /Reset Filters to Show All/i }).click();

    // Verify options are immediately restored
    await expect(page.getByText(/No transport options match your current filters/i)).not.toBeVisible();
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    await expect(cards).toHaveCount(2);
  });

  test('18. Switching between transport tabs and sorting updates visible options and counts', async ({ page }) => {
    const originInput = page.getByTestId('search-origin-input');
    const destInput = page.getByTestId('search-destination-input');

    await originInput.fill('New Delhi (DEL)');
    await destInput.fill('Mumbai (BOM)');
    await page.getByRole('button', { name: 'Find My Journey' }).click();

    await expect(page.getByText('Route Search Comparison').first()).toBeVisible({ timeout: 10000 });
    const cards = page.getByTestId('transport-card');
    await expect(cards.first()).toBeVisible();

    // 1. Switch to Trains tab
    await page.getByRole('button', { name: /Trains/i }).click();
    await expect(cards.filter({ hasText: /Train|Rajdhani/i }).first()).toBeVisible();
    await expect(cards.filter({ hasText: /Flight|IndiGo|Air India/i })).toHaveCount(0);

    // 2. Switch to Flights tab
    await page.getByRole('button', { name: /Flights/i }).click();
    await expect(cards.filter({ hasText: /Flight|IndiGo|Air India/i }).first()).toBeVisible();
    await expect(cards.filter({ hasText: /Train|Rajdhani/i })).toHaveCount(0);

    // 3. Switch to Buses tab
    await page.getByRole('button', { name: /Buses/i }).click();
    await expect(cards.filter({ hasText: /Bus|SmartBus/i }).first()).toBeVisible();

    // 4. Switch back to All Modes
    await page.getByRole('button', { name: /All Modes/i }).click();
    await expect(cards.filter({ hasText: /Flight/i }).first()).toBeVisible();
    await expect(cards.filter({ hasText: /Train/i }).first()).toBeVisible();

    // 5. Test Cheapest sort
    await page.getByRole('button', { name: /Cheapest/i }).click();
    await expect(cards.first()).toBeVisible();

    // 6. Test Fastest sort
    await page.getByRole('button', { name: /Fastest/i }).click();
    await expect(cards.first()).toBeVisible();
    // Fastest on Delhi-Mumbai must be flight (2h 10m)
    await expect(cards.first()).toContainText(/Flight|IndiGo|Air India/i);
  });
});
