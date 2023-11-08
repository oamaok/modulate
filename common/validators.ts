import { Cable, Patch } from './types'
import { modules } from '@modulate/worklets/src/modules'

const getModuleTypeByName = (name: string) => {
  const module = modules[name as keyof typeof modules] as
    | (typeof modules)[keyof typeof modules]
    | undefined
  return module ?? null
}

const isSameConnection = <C extends Cable['from'] | Cable['to']>(
  a: C,
  b: C
): boolean => {
  return a.index === b.index && a.moduleId === b.moduleId && a.type === b.type
}

export const validatePatch = (patch: Patch) => {
  const errors: string[] = []

  for (const moduleId in patch.modules) {
    const module = patch.modules[moduleId]!

    const moduleType = getModuleTypeByName(module.name)
    if (!moduleType) {
      errors.push(`module ${moduleId}: invalid module name (${module.name})`)
    }
  }

  const cableIds: Set<string> = new Set()

  for (const cable of patch.cables) {
    if (cableIds.has(cable.id)) {
      errors.push(`cable: duplicate cable id (${cable.id})`)
    }

    for (const otherCable of patch.cables) {
      if (cable === otherCable) continue
      if (
        isSameConnection(cable.from, otherCable.from) &&
        isSameConnection(cable.to, otherCable.to)
      ) {
        errors.push(
          `cable ${cable.id}: other cable shares identical connection (${otherCable.id})`
        )
        continue
      }
      if (isSameConnection(cable.to, otherCable.to)) {
        errors.push(
          `cable ${cable.id}: other cable is connected to the same input (${otherCable.id})`
        )
        continue
      }
    }

    const fromModule = patch.modules[cable.from.moduleId]

    if (!fromModule) {
      errors.push(
        `cable ${cable.id}: 'from' module does not exist in patch (${cable.from.moduleId})`
      )
    } else {
      const fromModuleType = getModuleTypeByName(fromModule.name)
      if (fromModuleType) {
        if (fromModuleType.outputs.length <= cable.from.index) {
          errors.push(
            `cable ${cable.id}: 'from' index (${cable.from.index}) is outside of module output range (${fromModule.name})`
          )
        }
      }
    }

    const toModule = patch.modules[cable.to.moduleId]

    if (!toModule) {
      errors.push(
        `cable ${cable.id}: 'to' module does not exist in patch (${cable.to.moduleId})`
      )
    } else {
      const toModuleType = getModuleTypeByName(toModule.name)
      if (toModuleType) {
        if (cable.to.type === 'input') {
          if (toModuleType.inputs.length <= cable.to.index) {
            errors.push(
              `cable ${cable.id}: 'to' index (${cable.to.index}) is outside of module input range (${toModule.name})`
            )
          }
        }

        if (cable.to.type === 'parameter') {
          if (toModuleType.parameters.length <= cable.to.index) {
            errors.push(
              `cable ${cable.id}: 'to' index (${cable.to.index}) is outside of module parameter range (${toModule.name})`
            )
          }
        }
      }
    }
  }

  for (const moduleId in patch.knobs) {
    const moduleForKnob = patch.modules[moduleId]
    const knobs = patch.knobs[moduleId]!
    if (!moduleForKnob) {
      errors.push(`knob: knob settings for unknown module found (${moduleId})`)
    } else {
      const moduleType = getModuleTypeByName(moduleForKnob.name)
      if (moduleType) {
        for (const param in knobs) {
          if (!(param in moduleType.parameters)) {
            errors.push(
              `knob: invalid knob ${param} for module ${moduleType} (${moduleId})`
            )
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
