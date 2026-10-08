/**
 * Upload wizard tests (plan section 6).
 * Rendered with react-dom/server so no jsdom is needed: the wizard rules
 * live in pure helpers and the components are prop-driven.
 */
import { renderToStaticMarkup } from "react-dom/server";
import {
  canPublish,
  showsCountryPicker,
  slotsForMode,
} from "@/app/(dashboard)/coastal/admin/upload/components/upload-helpers";
import { PublishBar } from "@/app/(dashboard)/coastal/admin/upload/components/PublishBar";
import { AccessDenied } from "@/app/(dashboard)/coastal/admin/upload/components/AccessDenied";

describe("slotsForMode", () => {
  it("requires all five slots for a new country", () => {
    const slots = slotsForMode("new");
    expect(slots).toHaveLength(5);
    expect(slots.every((slot) => slot.required)).toBe(true);
  });

  it("requires only the ABT grains for replace", () => {
    const slots = slotsForMode("replace");
    const required = slots.filter((slot) => slot.required).map((slot) => slot.key);
    expect(required).toEqual(["monthly", "weekly"]);
  });
});

describe("showsCountryPicker", () => {
  it("hides the country picker for a new country", () => {
    expect(showsCountryPicker("new")).toBe(false);
    expect(showsCountryPicker("replace")).toBe(true);
  });
});

describe("canPublish", () => {
  it("needs readiness plus the confirm checkbox", () => {
    expect(canPublish(false, true, "replace", "")).toBe(false);
    expect(canPublish(true, false, "replace", "")).toBe(false);
    expect(canPublish(true, true, "replace", "")).toBe(true);
  });

  it("needs a country name for new countries", () => {
    expect(canPublish(true, true, "new", "")).toBe(false);
    expect(canPublish(true, true, "new", "Vietnam")).toBe(true);
  });
});

describe("PublishBar", () => {
  const baseProps = {
    mode: "replace" as const,
    publishing: false,
    receipt: null,
    error: null,
    onPublish: () => {},
    onReset: () => {},
  };

  it("renders Publish disabled until validation passed plus confirm checked", () => {
    const notReady = renderToStaticMarkup(
      <PublishBar {...baseProps} readiness={false} />
    );
    expect(notReady).toMatch(/disabled/);
  });
});

describe("AccessDenied", () => {
  it("renders the denied state for non allowed users", () => {
    const html = renderToStaticMarkup(<AccessDenied email="intruder@example.com" />);
    expect(html).toMatch(/Access denied/);
    expect(html).toMatch(/intruder@example\.com/);
  });
});
