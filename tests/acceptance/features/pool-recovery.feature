Feature: Database connection recovery
  Scenario: The backend survives an idle connection failure and database outage
    Then the backend recovers from a terminated idle connection and a temporary database outage
