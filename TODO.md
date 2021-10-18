# TODO

## View offset stuffs:

- Single transform on a container
- Calculate bounding box for the cable SVG instead of using the viewport h/w. Should be easy just by iterating over socket positions. Maybe still resize so that the user cannot drag the cables outside the bounding box, so i.e. the SVG element's boundary will alway hug the viewport edge, but the minimum size will be defined by the bounding box.

## Modules

- MIDI input
- Better oscillator, maybe multiple
- Mixer
- Octave
- Delay
- Reverb
- Distortion
- Compressor
- Limiter
- LFO

- Controllable ADSR

## Knobs

- Exponential curves (for e.g. ADSR timings: presice short timings, impresice long ones)
- Unit types (seconds, Hz, volts, etc)

# Module selector

- Starred items
- Ability to drag the modules from the selector

# General UI/UX

- Load unsaved patch Y/N at startup to mask the audio init
- Hotkey configuration?
- Global volume control
