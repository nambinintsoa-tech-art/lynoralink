#!/usr/bin/env node

/**
 * Script de test pour les routes d'authentification (login et register)
 * Utilisation: node test_auth.mjs
 */

const BASE_URL = "http://localhost:3000";
const API_URL = `${BASE_URL}/api`;

// Couleurs pour le terminal
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testRegister() {
  log("\n📝 === TEST REGISTRATION ===", "blue");

  const testEmail = `testuser_${Date.now()}@test.com`;
  const testPassword = "SecurePassword123!";
  const testData = {
    name: "Test User",
    email: testEmail,
    password: testPassword,
    title: "Test Developer",
    birthDate: "1990-01-15",
  };

  try {
    log(`Testing registration with email: ${testEmail}`, "cyan");
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData),
    });

    const data = await response.json();
    
    if (response.ok) {
      log(`✓ Registration successful`, "green");
      log(`User ID: ${data.user?.id}`, "green");
      return { success: true, email: testEmail, password: testPassword };
    } else {
      log(`✗ Registration failed (${response.status})`, "red");
      log(`Error: ${data.error || JSON.stringify(data)}`, "red");
      return { success: false };
    }
  } catch (error) {
    log(`✗ Registration test error: ${error.message}`, "red");
    return { success: false };
  }
}

async function testInvalidRegister() {
  log("\n📝 === TEST INVALID REGISTRATION ===", "blue");

  const invalidCases = [
    {
      name: "Email invalid",
      data: {
        name: "Test",
        email: "invalid-email",
        password: "SecurePassword123!",
        birthDate: "1990-01-15",
      },
    },
    {
      name: "Mot de passe faible",
      data: {
        name: "Test",
        email: `test_${Date.now()}@test.com`,
        password: "weak",
        birthDate: "1990-01-15",
      },
    },
    {
      name: "Nom manquant",
      data: {
        name: "",
        email: `test_${Date.now()}@test.com`,
        password: "SecurePassword123!",
        birthDate: "1990-01-15",
      },
    },
  ];

  for (const testCase of invalidCases) {
    try {
      log(`Testing: ${testCase.name}`, "cyan");
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testCase.data),
      });

      const data = await response.json();

      if (!response.ok) {
        log(`✓ Correctly rejected: ${data.error}`, "green");
      } else {
        log(`✗ Should have been rejected but was accepted`, "red");
      }
    } catch (error) {
      log(`✗ Error: ${error.message}`, "red");
    }
  }
}

async function testLogin(email, password) {
  log("\n🔐 === TEST LOGIN ===", "blue");

  try {
    log(`Testing login with email: ${email}`, "cyan");
    
    // First test: Check session before login
    let sessionResponse = await fetch(`${API_URL}/auth/session`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    
    let sessionData = await sessionResponse.json();
    log(`Session before login: ${sessionData.user ? "Logged in" : "Not logged in"}`, "cyan");

    // Use NextAuth signin endpoint
    const response = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
      credentials: "include",
    });

    log(`Login response status: ${response.status}`, "cyan");

    if (response.redirected) {
      log(`✓ Login successful (redirected to: ${response.url})`, "green");
      return { success: true };
    } else {
      const data = await response.json();
      if (data.error) {
        log(`✗ Login failed: ${data.error}`, "red");
      } else if (response.ok) {
        log(`✓ Login successful`, "green");
        return { success: true };
      } else {
        log(`✗ Login failed (${response.status}): ${JSON.stringify(data)}`, "red");
      }
    }
  } catch (error) {
    log(`✗ Login test error: ${error.message}`, "red");
  }
  return { success: false };
}

async function testInvalidLogin() {
  log("\n🔐 === TEST INVALID LOGIN ===", "blue");

  const invalidCases = [
    {
      name: "Email inexistent",
      email: `nonexistent_${Date.now()}@test.com`,
      password: "RandomPassword123!",
    },
    {
      name: "Email vide",
      email: "",
      password: "SomePassword123!",
    },
    {
      name: "Mot de passe vide",
      email: "test@test.com",
      password: "",
    },
  ];

  for (const testCase of invalidCases) {
    try {
      log(`Testing: ${testCase.name}`, "cyan");
      const response = await fetch(`${BASE_URL}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testCase.email,
          password: testCase.password,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        log(`✓ Correctly rejected: ${data.error || "Invalid credentials"}`, "green");
      } else {
        log(`✗ Should have been rejected`, "red");
      }
    } catch (error) {
      log(`✗ Error: ${error.message}`, "red");
    }
  }
}

async function testApiConnectivity() {
  log("\n🔌 === TEST API CONNECTIVITY ===", "blue");

  try {
    log(`Testing connection to ${BASE_URL}...`, "cyan");
    const response = await fetch(`${BASE_URL}/api/auth/session`, {
      method: "GET",
    });

    if (response.ok || response.status === 401) {
      log(`✓ API is reachable`, "green");
      return true;
    } else {
      log(`✗ API responded with status ${response.status}`, "red");
      return false;
    }
  } catch (error) {
    log(`✗ Cannot reach API: ${error.message}`, "red");
    log(`Make sure the dev server is running on ${BASE_URL}`, "yellow");
    return false;
  }
}

async function runAllTests() {
  log("\n🚀 === TESTS D'AUTHENTIFICATION COMPLETS ===\n", "blue");

  // Test API connectivity first
  const isConnected = await testApiConnectivity();
  if (!isConnected) {
    log("\n⚠️  Cannot continue tests without API connection", "yellow");
    return;
  }

  // Run all tests
  const registerResult = await testRegister();
  await testInvalidRegister();

  if (registerResult.success) {
    await testLogin(registerResult.email, registerResult.password);
  }

  await testInvalidLogin();

  log("\n✅ === TESTS TERMINÉS ===\n", "green");
}

// Run tests
runAllTests().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, "red");
  process.exit(1);
});
