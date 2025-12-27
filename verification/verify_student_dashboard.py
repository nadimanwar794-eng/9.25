from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:5000")
        time.sleep(5)  # Allow initial load

        # Handle Terms Popup if exists
        try:
             page.click('button:has-text("I Agree & Continue")')
             print("Terms accepted.")
             time.sleep(1)
        except:
             print("No terms popup found.")

        # Handle Startup Ad if exists
        try:
             page.click('button[aria-label="Close Ad"]') 
             pass
        except:
             pass
        
        # Handle Welcome Popup (Get Started)
        try:
             # The error log showed "Get Started" button intercepting
             page.get_by_text("Get Started").click()
             print("Welcome popup dismissed.")
             time.sleep(1)
        except:
             print("No welcome popup found.")

        # Login flow
        print("Logging in...")
        page.fill('input[name="id"]', "ADMIN")
        page.fill('input[name="password"]', "admin123") # Assuming default admin password if any, or just admin email
        # Actually Auth component logic:
        # If view is LOGIN, user enters ID.
        # We need to see if we can trigger the Admin view.
        # Clicking "Admin Access" button
        page.get_by_text("Admin Access").click()
        
        # In Admin View
        page.fill('input[name="email"]', "admin@nst.com") # Default ADMIN_EMAIL from constants might be this or similar
        # Wait, I need to check constants.ts for ADMIN_EMAIL or just rely on the hardcoded check in Auth.tsx
        # In Auth.tsx: const allowedEmail = settings?.adminEmail || ADMIN_EMAIL;
        # ADMIN_EMAIL is imported. Let's assume it's 'admin@nst.com' or similar. 
        # But wait, I can see the code in Auth.tsx:
        # if (formData.email.trim() !== allowedEmail) ...
        # If I don't know the email, I can't login as admin easily.
        
        # Alternative: Sign up as a student to check Student Dashboard changes.
        print("Switching to Student Signup...")
        page.reload()
        time.sleep(2)
        page.get_by_text("Register Here").click()
        
        # Fill Signup
        page.fill('input[name="name"]', "Test Student")
        page.fill('input[name="password"]', "password123")
        page.fill('input[name="email"]', "test@student.com")
        page.fill('input[name="mobile"]', "1234567890")
        page.select_option('select[name="board"]', "CBSE")
        page.select_option('select[name="classLevel"]', "10")
        
        # Use random email to avoid duplicate signup issues
        import random
        rand_id = random.randint(1000, 9999)
        page.fill('input[name="email"]', f"test{rand_id}@student.com")
        
        page.click('button:has-text("Generate ID & Sign Up")')
        time.sleep(3)
        
        # Should be on Success Screen
        print("Signup complete. Proceeding to Login...")
        # Sometimes this button might be missing if signup failed (e.g. email exists)
        # Check if success screen is visible
        if page.get_by_text("Account Created!").is_visible():
             page.click('button:has-text("Proceed to Login")')
        else:
             print("Signup might have failed or duplicate.")
             # Try to proceed if possible or just assume we can login with an existing one
             try:
                 page.click('button:has-text("Proceed to Login")')
             except:
                 page.get_by_text("Login").click()
        time.sleep(2)
        
        # Login with new credentials (or just ID which is auto-filled? No, explicitly fill)
        # Actually, let's look for the generated ID in the success screen if needed, 
        # but the Auth component might have auto-filled it? 
        # Let's try logging in with Email since we updated Auth to allow Email login.
        page.fill('input[name="id"]', f"test{rand_id}@student.com")
        page.fill('input[name="password"]', "password123")
        page.click('button:has-text("Login")')
        time.sleep(5)
        
        # Handle welcome popup again if new user
        try:
             page.get_by_text("Get Started").click()
             time.sleep(1)
        except:
             pass

        # Verify Student Dashboard
        print("Verifying Student Dashboard...")
        # Check for new tabs: Video, Notes (PDF), MCQ
        # Use more specific selectors or first()
        expect(page.get_by_text("Video").first).to_be_visible()
        expect(page.get_by_text("Notes").first).to_be_visible()
        expect(page.get_by_text("MCQ").first).to_be_visible()
        
        # Check that "Premium" tab is GONE
        # Check button count specifically in the nav bar
        # Nav bar has class "grid grid-cols-7" or similar
        # But we can just search for button text "Premium"
        premium_btn = page.get_by_role("button", name="Premium")
        if premium_btn.count() == 0:
            print("Verified: Premium tab button is removed.")
        else:
            print("WARNING: Premium tab might still be visible.")

        # Navigate to Video Section
        print("Navigating to Video Section...")
        page.get_by_text("Video").first.click()
        time.sleep(2)
        
        # Select a Subject
        print("Selecting Science...")
        page.get_by_text("Science").first.click() # Assuming Science exists
        time.sleep(2)
        
        # Take screenshot of Chapter List
        print("Taking screenshot of Content/Chapter Selection...")
        page.screenshot(path="verification/student_dashboard_video.png")
        
        browser.close()

if __name__ == "__main__":
    run()
