import {DocumentsList} from "@/components/document-list.tsx";

export default function AdminPage() {
    return (
        <div className="p-8">
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-balance">Documents</h1>
                    <p className="text-muted-foreground mt-2">Manage your PDF documents and signatures</p>
                </div>
                <DocumentsList />
            </div>
        </div>
    )
}
