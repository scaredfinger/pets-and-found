Feature: Database readiness
  Scenario: Incomplete or damaged migration state is not ready
    Given an isolated database schema
    Then the backend rejects incomplete or damaged migration state
