import path from 'path'
import sqlite from 'sqlite3'
import sql, { SQLStatement } from 'sql-template-strings'
import { v4 as uuid } from 'uuid'
import argon2 from 'argon2'
import { Patch } from '../../common/types'

const db = new (sqlite.verbose().Database)(
  path.resolve(__dirname, '../../data/database.sqlite3')
)

export const query = (
  query: string | SQLStatement,
  parameters: (number | string)[] = []
) => {
  if (typeof query === 'object') {
    return new Promise<any[]>((resolve, reject) =>
      db.all(query.sql, query.values, (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    )
  } else {
    return new Promise<any[]>((resolve, reject) =>
      db.all(query, parameters, (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    )
  }
}

export const createAnonymousUser = async (): Promise<string> => {
  const id = uuid()
  await query(sql`INSERT INTO users (id) VALUES (${id})`)
  return id
}

export const isUsernameFree = async (username: string): Promise<boolean> => {
  const rows = await query(
    sql`SELECT COUNT(id) AS count FROM users WHERE username = ${username}`
  )

  return rows.length === 0
}

export const registerUser = async (
  userId: string,
  username: string,
  password: string
) => {
  await query(sql`
    UPDATE users
    SET
      username = ${username},
      password = ${argon2.hash(password)},
      createdAt = ${Date.now()}
    WHERE id = ${userId}  
  `)
}

export const getUserPatches = (userId: string) => {
  return query(sql`
    SELECT id, name, version, createdAt
    FROM patches
    WHERE authorId = ${userId}
  `)
}

export const getLatestPatchVersion = async (patchId: string) => {
  const [patch] = await query(sql`
    SELECT id, patch, name version, createdAt
    FROM patches
    WHERE id = ${patchId}
    ORDER BY version DESC
    LIMIT 1
  `)

  if (!patch) return null

  return {
    ...patch,
    patch: JSON.parse(patch.patch),
  }
}

export const getPatchVersion = (patchId: string, version: number) => {
  return query(sql`
    SELECT id, patch, name version, createdAt
    FROM patches
    WHERE id = ${patchId} AND version = ${version}
  `)
}
export const saveNewPatch = async (
  userId: string,
  patchName: string,
  patch: Patch
) => {
  const patchId = uuid()

  const res = await query(sql`
    INSERT INTO patches (id, name, authorId, createdAt, patch)
    VALUES (${patchId}, ${patchName}, ${userId}, ${Date.now()}, ${JSON.stringify(
    patch
  )})
  `)

  return { id: patchId, version: 0 }
}

export const savePatchVersion = async (
  userId: string,
  patchId: string,
  patch: Patch
) => {
  const [latestVersion] = await query(sql`
    SELECT version FROM patches WHERE id = ${patchId} ORDER BY version DESC LIMIT 1
  `)

  const nextVersion = latestVersion.version + 1

  await query(sql`
    INSERT INTO patches (id, version, name, authorId, createdAt, patch)
    VALUES (${patchId}, ${nextVersion}, 'untitled', ${userId}, ${Date.now()}, ${JSON.stringify(
    patch
  )})
  `)
  return { id: patchId, version: nextVersion }
}
