import CreateFolderForm from "@/components/CreateFolderForm";

export const metadata = { title: "Nova pasta — PokeTroca" };

export default function NovaPastaPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Nova pasta</h1>
      <CreateFolderForm />
    </div>
  );
}
