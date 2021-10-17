# TODO

## View offset stuffs:

- Single transform on a container
- Calculate bounding box for the cable SVG instead of using the viewport h/w. Should be easy just by iterating over socket positions. Maybe still resize so that the user cannot drag the cables outside the bounding box, so i.e. the SVG element's boundary will alway hug the viewport edge, but the minimum size will be defined by the bounding box.

## Modules

- Keyboard UI component (svg?)
- MIDI input
- Better oscillator, maybe multiple

## Knobs

- Exponential curves (for e.g. ADSR timings: presice short timings, impresice long ones)
- Unit types (seconds, Hz, volts, etc)

# Module selector

- Starred items
- Only accesible via hotkey?

# General UI/UX

- Load unsaved patch Y/N at startup to mask the audio init
- Hotkey configuration?
- Global volume control
