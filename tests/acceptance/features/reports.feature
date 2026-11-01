Feature: Animal report discovery
  Scenario: Create and discover a redacted Mallorca animal report
    Given the database is migrated and the website and backend are running
    When an anonymous visitor creates a found cat report in Mallorca
    Then the report is persisted and discoverable through public reports
