import {useRef, useState} from "react";

const recognition = new window.webkitSpeechRecognition();
const synth = window.speechSynthesis;

recognition.continuous = true;
recognition.lang = "es-AR";

synth.cancel();

function App() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [buffer, setBuffer] = useState<string>("");
  const [messages, setMessages] = useState<
    {
      role: "user" | "assistant" | "system";
      content: string;
    }[]
  >([
    {
      role: "system",
      content: `Sos una entrevistadora IT evaluando a un candidato para una posición React junior.
      * Siempre tenés que contestar en español Argentina.
      * Las respuestas no deben tener placeholder como "nombre de la empresa" o "mi nombre".
      * El idioma de entrevista es español argentino.
      * El idioma de respuesta es español argentino.
      * No puedes usar emojis.
      * No puedes usar markdown.
      * No puedes usar caracteres especiales fuera de los acentos latinos.
      * Deben ser preguntas técnicas acerca de React y su funcionamiento.`,
    },
  ]);
  const recordController = useRef(new AbortController());

  function handleStartRecording() {
    setIsRecording(true);

    synth.cancel();
    recognition.start();

    recognition.addEventListener(
      "result",
      (event) => {
        const buffer = event.results[event.resultIndex][0].transcript;

        setBuffer(buffer);
      },
      {
        signal: recordController.current.signal,
      },
    );
  }

  async function handleStopRecording() {
    setIsRecording(false);
    recognition.stop();
    recordController.current.abort();
    recordController.current = new AbortController();

    const draft = structuredClone(messages);

    draft.push({
      role: "user",
      content: buffer,
    });

    const answer = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      body: JSON.stringify({
        model: "llama3",
        stream: false,
        messages: draft,
      }),
    })
      .then(
        (response) =>
          response.json() as Promise<{
            message: {role: "assistant"; content: string};
          }>,
      )
      .then((response) => response.message);

    draft.push(answer);

    const utterance = new SpeechSynthesisUtterance(answer.content);

    utterance.lang = "es-AR";

    synth.speak(utterance);

    setMessages(draft);
  }

  console.log(messages);

  return (
    <main className="container m-auto grid min-h-screen grid-rows-[auto,1fr,auto] px-4">
      <header className="text-xl font-bold leading-[4rem]">EntrevistAIdor</header>
      <section className="grid place-content-center py-8">
        <button
          className={
            "h-64 w-64 rounded-full border-8 border-neutral-600 bg-red-500" +
            (isRecording ? " animate-pulse" : "")
          }
          onClick={isRecording ? handleStopRecording : handleStartRecording}
        />
      </section>
      <footer className="text-center leading-[4rem] opacity-70">
        © {new Date().getFullYear()} EntrevistAIdor
      </footer>
    </main>
  );
}

export default App;
