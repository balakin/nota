import { useCallback, useEffect, useRef, useState } from 'react';

import { noteOnFrom } from '../training/midi';

export type MidiStatus =
  'unsupported' | 'idle' | 'connecting' | 'denied' | 'ready';

export type MidiController = {
  status: MidiStatus;
  /** Names of the ports currently connected, for the setup panel. */
  devices: string[];
  connect: () => void;
  subscribe: (listener: (midi: number) => void) => () => void;
};

/** Web MIDI needs a secure context, so it is simply absent over plain http. */
function isSupported() {
  return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
}

/**
 * A connection to whatever MIDI keyboards the browser can see. Bluetooth LE
 * devices paired at the operating-system level arrive as ordinary ports, so
 * nothing here distinguishes them from a cable.
 *
 * Access is requested on demand rather than on mount: the browser asks the user
 * for permission, and that belongs to a deliberate press, not to page load.
 */
export function useMidiInput(): MidiController {
  const [status, setStatus] = useState<MidiStatus>(() =>
    isSupported() ? 'idle' : 'unsupported',
  );
  const [devices, setDevices] = useState<string[]>([]);
  const accessRef = useRef<MIDIAccess | null>(null);
  const listenersRef = useRef(new Set<(midi: number) => void>());

  const handleMessage = useCallback((event: MIDIMessageEvent) => {
    const note = noteOnFrom(event.data);
    if (note === null) return;
    for (const listener of listenersRef.current) listener(note);
  }, []);

  /** Re-run on every state change: a port that appears later needs the handler too. */
  const bindPorts = useCallback(
    (access: MIDIAccess) => {
      const names: string[] = [];
      access.inputs.forEach((port) => {
        port.onmidimessage = handleMessage;
        if (port.state === 'connected') names.push(port.name ?? 'MIDI');
      });
      setDevices(names);
    },
    [handleMessage],
  );

  const connect = useCallback(() => {
    if (!isSupported()) {
      setStatus('unsupported');
      return;
    }
    if (accessRef.current) {
      bindPorts(accessRef.current);
      return;
    }
    setStatus('connecting');
    navigator.requestMIDIAccess().then(
      (access) => {
        accessRef.current = access;
        access.onstatechange = () => bindPorts(access);
        bindPorts(access);
        setStatus('ready');
      },
      () => setStatus('denied'),
    );
  }, [bindPorts]);

  useEffect(
    () => () => {
      const access = accessRef.current;
      if (!access) return;
      access.onstatechange = null;
      access.inputs.forEach((port) => {
        port.onmidimessage = null;
      });
    },
    [],
  );

  const subscribe = useCallback((listener: (midi: number) => void) => {
    const listeners = listenersRef.current;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { status, devices, connect, subscribe };
}
