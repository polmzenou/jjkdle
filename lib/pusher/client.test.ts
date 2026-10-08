import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Faux client pusher-js : enregistre les connexions, abonnements et handlers
 * pour vérifier que tous les composants partagent UNE connexion par onglet.
 */
const created: FakePusher[] = [];

class FakeChannel {
  subscribed = true;
  handlers = new Map<string, Set<(p: unknown) => void>>();
  bind(event: string, fn: (p: unknown) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(fn);
  }
  unbind(event: string, fn: (p: unknown) => void) {
    this.handlers.get(event)?.delete(fn);
  }
  emit(event: string, payload: unknown) {
    for (const fn of this.handlers.get(event) ?? []) fn(payload);
  }
}

class FakePusher {
  channels = new Map<string, FakeChannel>();
  subscribeCalls: string[] = [];
  unsubscribeCalls: string[] = [];
  disconnects = 0;
  connects = 0;
  constructor() {
    created.push(this);
  }
  connect() {
    this.connects++;
  }
  disconnect() {
    this.disconnects++;
  }
  channel(name: string) {
    return this.channels.get(name);
  }
  subscribe(name: string) {
    this.subscribeCalls.push(name);
    let ch = this.channels.get(name);
    if (!ch) {
      ch = new FakeChannel();
      this.channels.set(name, ch);
    }
    return ch;
  }
  unsubscribe(name: string) {
    this.unsubscribeCalls.push(name);
    this.channels.delete(name);
  }
}

vi.mock("pusher-js", () => ({ default: FakePusher }));

/** Laisse se résoudre l'import dynamique de pusher-js (et ses `.then`). */
async function flush() {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
}

async function freshModule() {
  vi.resetModules();
  const mod = await import("./client");
  // Précharge pusher-js (mocké) pour que chaque test parte d'un module prêt.
  await import("pusher-js");
  return mod;
}

beforeEach(() => {
  created.length = 0;
  process.env.NEXT_PUBLIC_PUSHER_KEY = "key";
  process.env.NEXT_PUBLIC_PUSHER_CLUSTER = "eu";
});

describe("openChannel (connexion Pusher partagée)", () => {
  it("n'ouvre qu'UNE connexion et un abonnement par canal, quel que soit le nombre de composants", async () => {
    const { openChannel } = await freshModule();
    const a = openChannel("private-user-1");
    const b = openChannel("private-user-1");
    const c = openChannel("presence-lobby-ABC");
    await flush();

    expect(created).toHaveLength(1);
    expect(created[0].subscribeCalls).toEqual(["private-user-1", "presence-lobby-ABC"]);
    a.close();
    b.close();
    c.close();
  });

  it("route les évènements vers chaque abonné, et ne retire que les handlers de celui qui ferme", async () => {
    const { openChannel } = await freshModule();
    const got: string[] = [];
    const a = openChannel("private-user-1");
    a.bind("coins", () => got.push("a"));
    const b = openChannel("private-user-1");
    await flush();
    b.bind("coins", () => got.push("b")); // bind après que le canal est prêt

    const channel = created[0].channel("private-user-1")!;
    channel.emit("coins", {});
    expect(got).toEqual(["a", "b"]);

    a.close();
    channel.emit("coins", {});
    expect(got).toEqual(["a", "b", "b"]);
    expect(created[0].unsubscribeCalls).toEqual([]); // b écoute encore
    b.close();
  });

  it("se désabonne au dernier abonné et coupe la connexion quand plus aucun canal n'est ouvert", async () => {
    const { openChannel } = await freshModule();
    const user = openChannel("private-user-1");
    const lobby = openChannel("presence-lobby-ABC");
    await flush();
    const client = created[0];

    lobby.close();
    expect(client.unsubscribeCalls).toEqual(["presence-lobby-ABC"]);
    expect(client.disconnects).toBe(0);

    user.close();
    expect(client.unsubscribeCalls).toEqual(["presence-lobby-ABC", "private-user-1"]);
    expect(client.disconnects).toBe(1);

    // Réouverture plus tard (nouvelle page) : même client, reconnecté.
    const again = openChannel("presence-lobby-XYZ");
    await flush();
    expect(created).toHaveLength(1);
    expect(client.connects).toBeGreaterThanOrEqual(2);
    expect(client.subscribeCalls).toContain("presence-lobby-XYZ");
    again.close();
  });

  it("un canal fermé avant le chargement de pusher-js n'est jamais souscrit (double montage StrictMode)", async () => {
    const { openChannel } = await freshModule();
    const first = openChannel("presence-lobby-ABC");
    first.close();
    const second = openChannel("presence-lobby-ABC");
    await flush();

    expect(created[0].subscribeCalls).toEqual(["presence-lobby-ABC"]);
    second.close();
  });
});
