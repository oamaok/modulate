# Modules

## Oscillator

- [ ] Invert signal toggle
- [ ] Built-in filter
- [ ] Build-in ADSR
- [ ] Built-in LFO maybe?

## Equalizer

- [ ] Initial implementation

## LFO

- [ ] Invert signal toggle

## BouncyBoi

- [ ] Trigger pulse width
- [ ] Use direct memory access instead of events for rendering

## Sampler

- [ ] Loop option
- [ ] Built-in volume ADSR envelope
- [x] Gain knob

## ADSR

- [x] Visualizer
- [x] Make into generic component maybe?
- [x] Gain knob

## Sequencer

- [ ] Use direct memory access
- [ ] Reset input
- [ ] Reset button

## Clock

- [ ] Tempo input
- [ ] Reset input

## Voltage quantizer

Takes an input voltage and snaps it to the closest appropriate voltage selected using the keyboard component.

- [ ] Initial implementation

## Octave

- [ ] Initial implementation

## Flanger

- [ ] Initial implementation

## Chorus

- [x] Initial implementation

## Phaser

- [ ] Initial implementation

## Compressor

- [ ] Initial implementation

## Gate Sequencer

- [ ] Initial implementation

## "Analog" sequencer

- [ ] Initial implementation

## CV arpeggiator

- [ ] Initial implementation

## Sample&Hold

Input, Hold and internal clock.
Smoothing parameter?

- [ ] Initial implementation

## Chaos

Low frequency noise.

- [ ] Initial implementation

## Noise

- [ ] Initial implementation

## Amplitude follower

- [ ] Initial implementation

## Erosion copy

- [ ] Initial implementation

## Distortion

- [ ] Initial implementation

## Ring Mod

- [ ] Initial implementation

## Bit crusher

- [ ] Initial implementation

## Virtual controller

- [x] Initial implementation
- [ ] Add scale selector

## Piano roll

- [x] Initial implementation
- [ ] External clock support
- [ ] MIDI file import
- [ ] Multiple voices

# Testing

- [x] Add API testing

# UI/UX

- [ ] Hotkey configuration?
- [x] Global volume control
- [x] Right click menu for adding modules
- [ ] Select module on spawn
- [ ] Jump back to middle/audio-out
- [ ] Implement a minimap
- [ ] Color coding for modules

- [ ] Multiselect modules
- [ ] Copy modules with ctrl+drag
- [ ] Learn MIDI
- [ ] Add support for copying to clipboard

- context menu avaus ei mene pois jos liikuttaa sormea
- nuotin resize nuotin ulkopuolella

# Misc

- [ ] Use floating div instead of background position for parallax effect
- [ ] Move onDragStart handler from `Cables.tsx` to a more suitable component, maybe a completely separate component for handling clicks to the background
