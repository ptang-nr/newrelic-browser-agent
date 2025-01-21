import './GQL'

export function App() {

  function sendAjax(path: string) {
    let xhrDone = false
    var xhr = new XMLHttpRequest()
    xhr.open('GET', path)
    xhr.onload = function () { xhrDone = true }
    xhr.send()
  }

  // @ts-ignore: Unreachable code error
  const send = window.newrelic.captureAjax(sendAjax, { applicationId: 'vite-react-wrapper', licenseKey: 'vite-react-wrapper' })
  console.log("CAPTURE JSON AJAX FROM VITE")
  send('/json')
  return <div>Vite React</div>;
}
