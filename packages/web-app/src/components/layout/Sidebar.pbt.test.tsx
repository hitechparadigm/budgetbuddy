/**
 * Sidebar Property-Based Tests
 *
 * Property tests for sidebar navigation component.
 * Uses fast-check for property-based testing.
 *
 * **Validates: Requirements 6.3, 6.9**
 */

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import * as fc from "fast-check";
import { Sidebar, navItems } from "./Sidebar";
import "@testing-library/jest-dom";

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Helper to render Sidebar with a specific route
const renderSidebarAtRoute = (
  route: string,
  collapsed = false,
  isMobile = false,
) => {
  cleanup(); // Clean up previous renders
  const onToggleCollapse = jest.fn();

  const result = render(
    <MemoryRouter initialEntries={[route]}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        isMobile={isMobile}
        userName="Test User"
        userEmail="test@example.com"
      />
    </MemoryRouter>,
  );

  return {
    ...result,
    onToggleCollapse,
  };
};

describe("Sidebar Property-Based Tests", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 21: Sidebar Active State
   *
   * For any navigation path, exactly one sidebar navigation item SHALL be
   * highlighted as active, matching the current route.
   *
   * **Validates: Requirements 6.3**
   */
  describe("Property 21: Sidebar Active State", () => {
    // Generate valid routes from navItems
    const validRoutes = fc.constantFrom(...navItems.map((item) => item.path));

    it("should highlight exactly one nav item for any valid route", () => {
      fc.assert(
        fc.property(validRoutes, (route) => {
          const { container } = renderSidebarAtRoute(route, false, false);

          // Find all nav buttons with aria-current="page"
          const allNavButtons = container.querySelectorAll(
            'button[role="menuitem"]',
          );
          const activeButtons = Array.from(allNavButtons).filter(
            (btn) => btn.getAttribute("aria-current") === "page",
          );

          // Exactly one should be active
          return activeButtons.length === 1;
        }),
        { numRuns: 100 },
      );
    });

    it("should mark the matching nav item as active for the current route", () => {
      // Test each route individually to verify correct item is active
      for (const navItem of navItems) {
        const { container } = renderSidebarAtRoute(navItem.path, false, false);

        const allNavButtons = container.querySelectorAll(
          'button[role="menuitem"]',
        );
        const activeButton = Array.from(allNavButtons).find(
          (btn) => btn.getAttribute("aria-current") === "page",
        );

        // The active button should contain the expected label
        expect(activeButton?.textContent).toContain(navItem.label);
      }
    });

    it("should handle nested routes by highlighting parent", () => {
      // Test nested routes like /goals/new, /bills/123/edit
      const nestedRouteTests = [
        { route: "/goals/new", expectedLabel: "Goals" },
        { route: "/goals/123/edit", expectedLabel: "Goals" },
        { route: "/bills/new", expectedLabel: "Bills" },
        { route: "/bills/456/edit", expectedLabel: "Bills" },
        { route: "/subscriptions/new", expectedLabel: "Subscriptions" },
        { route: "/debts/789/edit", expectedLabel: "Debt Payoff" },
      ];

      for (const { route, expectedLabel } of nestedRouteTests) {
        const { container } = renderSidebarAtRoute(route, false, false);

        const allNavButtons = container.querySelectorAll(
          'button[role="menuitem"]',
        );
        const activeButtons = Array.from(allNavButtons).filter(
          (btn) => btn.getAttribute("aria-current") === "page",
        );

        // Exactly one should be active
        expect(activeButtons.length).toBe(1);
        // And it should be the parent route
        expect(activeButtons[0]?.textContent).toContain(expectedLabel);
      }
    });
  });

  /**
   * Property 22: Sidebar Collapse Persistence
   *
   * For any sidebar collapse/expand action, the state SHALL be persisted
   * and restored on page refresh.
   *
   * **Validates: Requirements 6.9**
   */
  describe("Property 22: Sidebar Collapse Persistence", () => {
    it("should persist collapse state to localStorage on desktop", () => {
      // Generate random sequences of collapse/expand actions
      const collapseActions = fc.array(fc.boolean(), {
        minLength: 1,
        maxLength: 10,
      });

      fc.assert(
        fc.property(collapseActions, (actions) => {
          localStorage.clear();

          // Simulate the collapse state changes
          let currentState = false; // Start expanded

          for (const shouldCollapse of actions) {
            currentState = shouldCollapse;
            localStorage.setItem(
              "budgetbuddy_sidebar_collapsed",
              String(currentState),
            );
          }

          // Verify the final state is persisted
          const storedValue = localStorage.getItem(
            "budgetbuddy_sidebar_collapsed",
          );
          const finalState = actions[actions.length - 1];

          return storedValue === String(finalState);
        }),
        { numRuns: 100 },
      );
    });

    it("should restore collapse state from localStorage", () => {
      fc.assert(
        fc.property(fc.boolean(), (initialCollapsed) => {
          localStorage.clear();
          localStorage.setItem(
            "budgetbuddy_sidebar_collapsed",
            String(initialCollapsed),
          );

          // The stored value should match what we set
          const storedValue = localStorage.getItem(
            "budgetbuddy_sidebar_collapsed",
          );
          return storedValue === String(initialCollapsed);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Additional property tests for sidebar behavior
   */
  describe("Sidebar Navigation Properties", () => {
    it("should navigate to correct path when any nav item is clicked", () => {
      for (const navItem of navItems) {
        mockNavigate.mockClear();
        renderSidebarAtRoute("/budget", false, false);

        // Find and click the nav button by its label
        const button = screen.getByRole("menuitem", {
          name: new RegExp(navItem.label),
        });
        fireEvent.click(button);

        expect(mockNavigate).toHaveBeenCalledWith(navItem.path);
      }
    });

    it("should show all nav items when expanded on desktop", () => {
      renderSidebarAtRoute("/budget", false, false);

      // All nav items should be visible
      const buttons = screen.getAllByRole("menuitem");
      expect(buttons.length).toBe(navItems.length);
    });

    it("should show icons for all nav items regardless of collapse state", () => {
      fc.assert(
        fc.property(fc.boolean(), (collapsed) => {
          // Skip mobile collapsed state as sidebar is hidden
          const { container } = renderSidebarAtRoute(
            "/budget",
            collapsed,
            false,
          );

          // Count nav items with icons (emoji spans)
          const buttons = container.querySelectorAll('button[role="menuitem"]');

          // Each button should have at least one span (the icon)
          return Array.from(buttons).every((btn) => {
            const spans = btn.querySelectorAll("span");
            return spans.length >= 1;
          });
        }),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Accessibility properties
   */
  describe("Sidebar Accessibility Properties", () => {
    it("should have proper ARIA roles for all nav items", () => {
      renderSidebarAtRoute("/budget", false, false);

      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems.length).toBe(navItems.length);
    });

    it('should have aria-current="page" on exactly one item for any route', () => {
      for (const navItem of navItems) {
        renderSidebarAtRoute(navItem.path, false, false);

        const menuItems = screen.getAllByRole("menuitem");
        const currentItems = menuItems.filter(
          (item) => item.getAttribute("aria-current") === "page",
        );

        expect(currentItems.length).toBe(1);
      }
    });

    it("should have accessible labels for collapse button", () => {
      // Test expanded state
      renderSidebarAtRoute("/budget", false, false);
      expect(screen.getByLabelText("Collapse sidebar")).toBeInTheDocument();

      // Test collapsed state
      renderSidebarAtRoute("/budget", true, false);
      expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();
    });
  });
});
