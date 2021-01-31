;(function () {
  var inputObj = window.arguments[0]

  function startup() {
    document.getElementById('num').focus()

    doSetOKCancel(
      function () {
        inputObj.num = GeckoJS.String.trim(document.getElementById('num').value)
        inputObj.ok = true
        return true
      },
      function () {
        inputObj.ok = false
        return true
      }
    )
  }

  window.addEventListener('load', startup, false)
})()
