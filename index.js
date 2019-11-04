const fs = require('fs')
const { exec, execSync } = require('child_process')
const chokidar = require('chokidar')
const level = require('level')
const db = level('./db')
const lineBreak = '\r\n'
const emptyComment = '<!--  -->'
const filename = './tmp.md'
const getLst = () => {
	return new Promise((res, rej) => {
		const lst = []
		const stream = db.createKeyStream()
		stream.on('data', d => lst.push(d))
		stream.on('end', async () => {
			res(lst)
		})
	})
}
const genFile = async (l, r, file = filename) => {
	// return new Promise((res, rej) => {
	// 	const lst = []
	// 	const stream = db.createKeyStream()
	// 	stream.on('data', d => lst.push(d))
	// 	stream.on('end', async () => {
	// 		var s = ''
	// 		// console.log(lst)
	// 		for (let x of lst.slice(l, r)) {
	// 			// console.log(x)
	// 			const tmp = await db.get(x)
	// 			s += tmp
	// 		}
	// 		// console.log(JSON.stringify(s))
	// 		fs.writeFileSync(file, s + emptyComment)
	// 		res()
	// 	})
	// })
	const lst = await getLst()
	var s = ''
	for (let x of lst.slice(l, r)) {
		s += await db.get(x)
	}
	fs.writeFileSync(file, s + emptyComment)
}
const update = async (filename) => {
	const fileContent = fs.readFileSync(filename).toString()
	if (!fileContent) return
	const lst = fileContent.split(lineBreak)
	var s = '', date = null
	for (let i = 0; i < lst.length; i++) {
		if (lst[i].startsWith('# ')) {
			if (date) {
				await db.put(date, s)
				// console.log(date)
			}
			s = lst[i] + lineBreak
			const a = lst[i].slice(2).split('-')
			// console.log(lst[i])
			date = a.map(x => x.toString().padStart(2, '0')).join('')
		}
		else if (lst[i] === emptyComment) { }
		else s += lst[i] + lineBreak
	}
	await db.put(date, s)
	// console.log(date)
}
const startService = async () => {
	await genFile(process.argv.indexOf('all') === -1 ? -3 : undefined)
	const watcher = chokidar.watch(filename)
	watcher.on('change', (filename, stat) => {
		update(filename)
	})
	process.on('SIGINT', async () => {
		await update(filename)
		await genFile(undefined, undefined, 'notes/notes.md')
		// await db.close()
		const opt = {
			cwd: './notes'
		}
		// execSync('git add .', opt)
		// execSync(`git commit -m "${new Date()}"`, opt)
		exec('git add .', opt, () => {
			exec(`git commit -m "${new Date()}"`, opt, () => {
				process.exit()
			}).stderr.pipe(process.stderr)
		}).stderr.pipe(process.stderr)
	})
}
if (process.argv.indexOf('gen') === -1) {
	startService()
}
else {
	update('notes.md')
	execSync('git init', { cwd: './notes' })
}