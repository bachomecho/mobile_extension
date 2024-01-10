let cache = new Array<Map<string, Element[]>>()

chrome.runtime.onMessage.addListener(function(request){
  console.log("connection is healthy.")
  console.log("message: ", request.queue)
  if (cache.length >= 3) {
    cache = cache.slice(1)
    cache.push(request.queue)
  }
  cache.push(request.queue)
})

console.log("cache look at it!", cache)