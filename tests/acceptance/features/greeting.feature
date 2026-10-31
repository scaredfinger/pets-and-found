Feature: Website greeting
  Scenario: Greet a visitor through the backend
    Given the database is migrated and the website and backend are running
    And the backend is ready
    When a visitor requests a greeting for "Ada"
    Then the website displays "Hello, Ada!"

  Scenario: Malformed requests do not stop either application
    Given the database is migrated and the website and backend are running
    When both applications receive a malformed request target
    Then both applications reject it and continue serving requests
