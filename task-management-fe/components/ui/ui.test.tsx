import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BackLink } from "./back-link";
import { Button, ButtonLink, buttonClasses } from "./button";
import { FormattedDate } from "./formatted-date";
import { FormField, controlProps, inputClasses } from "./form-field";
import { PageHeader } from "./page-header";

describe("Button", () => {
  it("defaults to a primary, non-submitting button", () => {
    render(<Button>Go</Button>);
    const button = screen.getByRole("button", { name: "Go" });
    expect(button).toHaveAttribute("type", "button");
    expect(button.className).toBe(buttonClasses("primary"));
  });

  it("accepts a variant, type and extra classes", () => {
    render(
      <Button variant="danger" type="submit" className="extra">
        Delete
      </Button>
    );
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button.className).toBe(`${buttonClasses("danger")} extra`);
  });
});

describe("ButtonLink", () => {
  it("renders a styled link", () => {
    render(
      <ButtonLink href="/x" variant="secondary">
        Open
      </ButtonLink>
    );
    const link = screen.getByRole("link", { name: "Open" });
    expect(link).toHaveAttribute("href", "/x");
    expect(link.className).toBe(buttonClasses("secondary"));
  });

  it("defaults to primary and appends classes", () => {
    render(
      <ButtonLink href="/y" className="extra">
        Y
      </ButtonLink>
    );
    expect(screen.getByRole("link", { name: "Y" }).className).toBe(`${buttonClasses("primary")} extra`);
  });
});

describe("BackLink", () => {
  it("links back with a default label", () => {
    render(<BackLink href="/" />);
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/");
  });

  it("accepts a custom label", () => {
    render(<BackLink href="/tasks" label="Back to tasks" />);
    expect(screen.getByRole("link", { name: "Back to tasks" })).toHaveAttribute("href", "/tasks");
  });
});

describe("FormattedDate", () => {
  it("renders a UTC timestamp in a <time> element", () => {
    render(<FormattedDate iso="2026-11-25T12:00:00.000Z" />);
    const time = screen.getByText(/Nov 25, 2026/);
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("dateTime", "2026-11-25T12:00:00.000Z");
    expect(time).toHaveTextContent("12:00 PM UTC");
  });
});

describe("FormField validation", () => {
  it("shows a red asterisk for required fields", () => {
    render(
      <FormField id="r" label="Title" required>
        <input {...controlProps("r")} />
      </FormField>
    );
    const star = screen.getByText("*");
    expect(star).toHaveAttribute("aria-hidden", "true");
    expect(star).toHaveClass("text-red-600");
  });

  it("shows the error and wires it to the control", () => {
    render(
      <FormField id="e" label="Title" error="Title is required.">
        <input {...controlProps("e", "Title is required.")} />
      </FormField>
    );
    const input = screen.getByLabelText("Title");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Title is required.");
    expect(input.className).toBe(inputClasses(true));
  });

  it("renders valid controls without error state", () => {
    render(
      <FormField id="v" label="Notes">
        <input {...controlProps("v")} />
      </FormField>
    );
    const input = screen.getByLabelText("Notes");
    expect(input).toHaveAttribute("name", "v");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input.className).toBe(inputClasses());
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });
});

describe("FormField", () => {
  it("labels its control and shows an optional hint", () => {
    render(
      <FormField id="f" label="Name" hint="(optional)">
        <input id="f" />
      </FormField>
    );
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByText("(optional)")).toBeInTheDocument();
  });

  it("omits the hint when not given", () => {
    render(
      <FormField id="g" label="Title">
        <input id="g" />
      </FormField>
    );
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
  });
});

describe("PageHeader", () => {
  it("renders the title and actions", () => {
    render(<PageHeader title="Tasks" actions={<button>Act</button>} />);
    expect(screen.getByRole("heading", { level: 1, name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Act" })).toBeInTheDocument();
  });

  it("renders without actions", () => {
    const { container } = render(<PageHeader title="Solo" />);
    expect(container.querySelectorAll("header > div")).toHaveLength(0);
  });
});
