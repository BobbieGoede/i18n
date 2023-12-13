const soDo = async () => {
  console.log(process.argv)
  await new Promise(resolve => setTimeout(resolve, 1000))
  console.log(process.argv)

  process.send({ hello: 'world?' })
}

export default soDo
