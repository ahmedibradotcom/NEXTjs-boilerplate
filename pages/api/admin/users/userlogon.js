import nc from 'next-connect'
import db from '../../../../utils/db'
import UserLogon from '../../../../models/UserLogon'
import { isAuth, isAdmin } from '../../../../utils/auth'

const handler = nc()
handler.use(isAuth, isAdmin)

handler.get(async (req, res) => {
  await db.connect()

  let query = UserLogon.find()

  const page = parseInt(req.query.page) || 1
  const pageSize = parseInt(req.query.limit) || 50
  const skip = (page - 1) * pageSize
  const total = await UserLogon.countDocuments()

  const pages = Math.ceil(total / pageSize)

  query = query
    .skip(skip)
    .limit(pageSize)
    .sort({ logDate: -1 })
    .populate('user', ['name', 'email'])

  const result = await query
  await db.disconnect()

  res.send({
    startIndex: skip + 1,
    endIndex: skip + result.length,
    count: result.length,
    page,
    pages,
    total,
    data: result,
  })
})

export default handler
