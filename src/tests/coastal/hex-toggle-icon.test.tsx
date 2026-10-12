/**
 * The hex visibility button must keep its eye icon when the Leaflet map is
 * rebuilt (side-by-side remount: cached deck modules get a new identity, the
 * init effect re-runs and creates a fresh, empty control link).
 * Real component and real react-dom; only Leaflet, deck.gl and the DOM are faked.
 */
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

const mockMaps: any[] = [];
const mockDoc: any = {
  nodeType: 9,
  createElement: (tag: string) => mockNode(tag.toUpperCase()),
  createTextNode: (text: string) => Object.assign(mockNode("#text", 3), { nodeValue: text }),
  addEventListener() {},
  defaultView: { HTMLIFrameElement: class {} } as any,
};
mockDoc.defaultView.document = mockDoc;

function mockNode(name: string, nodeType = 1): any {
  const node: any = {
    nodeType, nodeName: name, tagName: name, ownerDocument: mockDoc, parentNode: null,
    childNodes: [] as any[], attrs: {} as Record<string, string>, innerHTML: "",
    style: { setProperty() {}, removeProperty() {} },
    addEventListener() {}, removeEventListener() {},
    setAttribute(k: string, v: unknown) { node.attrs[k] = String(v); },
    getAttribute: (k: string) => node.attrs[k] ?? null,
    removeAttribute(k: string) { delete node.attrs[k]; },
    removeChild(c: any) { node.childNodes.splice(node.childNodes.indexOf(c), 1); c.parentNode = null; return c; },
    insertBefore(c: any, ref: any) {
      c.parentNode?.removeChild(c);
      const at = ref ? node.childNodes.indexOf(ref) : node.childNodes.length;
      node.childNodes.splice(at, 0, c);
      c.parentNode = node;
      return c;
    },
    appendChild: (c: any) => node.insertBefore(c, null),
    get firstChild() { return node.childNodes[0] ?? null; },
    get nextSibling() { const s = node.parentNode?.childNodes; return s?.[s.indexOf(node) + 1] ?? null; },
  };
  return node;
}

const mockL = {
  map() {
    const m: any = {
      controls: [], removed: false, getZoom: () => 11, on() {}, off() {},
      fitBounds() {}, setView() {}, invalidateSize() {}, remove() { m.removed = true; },
    };
    mockMaps.push(m);
    return m;
  },
  control: { zoom: () => ({ addTo: (m: any) => m }) },
  Control: {
    extend: (proto: any) =>
      class {
        addTo(m: any) { m.controls.push(proto.onAdd.call(this)); return this; }
      },
  },
  DomUtil: {
    create(tag: string, _cls: string, parent?: any) {
      const el = mockDoc.createElement(tag);
      parent?.appendChild(el);
      return el;
    },
  },
  DomEvent: { on() {}, preventDefault() {}, disableClickPropagation() {} },
  tileLayer: () => ({ addTo: (m: any) => m }),
  layerGroup: () => ({ addTo() { return this; }, clearLayers() {} }),
};

jest.mock("leaflet", () => ({ __esModule: true, default: mockL }));
jest.mock("leaflet/dist/leaflet.css", () => ({}));
jest.mock("@deck.gl-community/leaflet", () => ({
  DeckOverlay: class { addTo() {} remove() {} setProps() {} },
}));
jest.mock("deck.gl", () => ({ PolygonLayer: class {}, ScatterplotLayer: class {}, TextLayer: class {} }));
jest.mock("@/services/coastalService", () => ({
  fetchSpatialGrid: () => Promise.resolve({ features: [] }),
}));
jest.mock("@mui/material", () => ({
  Box: "div", Typography: "span", Button: "button", CircularProgress: "i", IconButton: "button",
}));
jest.mock("@mui/icons-material/LocationSearching", () => ({ __esModule: true, default: "i" }));
jest.mock("@mui/icons-material/Close", () => ({ __esModule: true, default: "i" }));
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: unknown) => {
    (globalThis as any).mockLoadMap = loader;
    return () => null;
  },
}));

import "@/app/(dashboard)/coastal/components/CoastalChoroplethMap";

const props = { country: "idn", activeIndicator: "vessels", onSelectCell() {} };

async function mount() {
  const Client = await (globalThis as any).mockLoadMap();
  const root = createRoot(mockDoc.createElement("div"));
  await act(async () => { root.render(createElement(Client, props)); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  return root;
}

const liveLinks = () => {
  const live = mockMaps.filter((m) => !m.removed);
  expect(live).toHaveLength(1);
  return live[0].controls.map((c: any) => c.firstChild);
};

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  (globalThis as any).window = mockDoc.defaultView;
  Object.assign(globalThis, { requestAnimationFrame: () => 0, cancelAnimationFrame() {} });
});

describe("hex visibility button icon", () => {
  it("paints the eye icon on first mount", async () => {
    const root = await mount();
    const links = liveLinks();
    expect(links).toHaveLength(2);
    expect(links.map((l: any) => l.innerHTML.includes("<svg"))).toEqual([true, true]);
    await act(async () => root.unmount());
  });

  it("keeps the eye icon after remount rebuilds the map", async () => {
    mockMaps.length = 0;
    const root = await mount();
    await act(async () => root.unmount());
    mockMaps.length = 0;
    const second = await mount();
    expect(mockMaps.length).toBeGreaterThan(1);
    const links = liveLinks();
    expect(links).toHaveLength(2);
    expect(links.map((l: any) => l.innerHTML.includes("<svg"))).toEqual([true, true]);
    await act(async () => second.unmount());
  });
});
