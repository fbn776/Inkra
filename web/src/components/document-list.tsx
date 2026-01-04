"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Loader2, FileText, CheckCircle2, AlertCircle, Trash2, Edit, Copy } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {Link, useNavigate} from "react-router";
import ApiInstance from "@/lib/axios.ts";

interface Document {
    id: string
    title: string
    description: string
    originalName: string
    isSigned: boolean
    signedAt?: string
    ipWhitelist: string[]
    tags: string[]
    createdAt: string
}

interface DocsResponse {
    data: {
        docs: Document[]
        total: number
        page: string
        limit: string
    }
    success: boolean
}

export function DocumentsList() {
    const navigate = useNavigate()
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [searchKeyword, setSearchKeyword] = useState("")
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [deleting, setDeleting] = useState<string | null>(null)
    const limit = 10

    useEffect(() => {
        loadDocuments()
    }, [page, searchKeyword])

    const loadDocuments = async () => {
        try {
            setLoading(true)
            setError("")
            const response = (await ApiInstance.get("/api/docs", {
                params: {
                    page,
                    limit,
                    keyword: searchKeyword || undefined,
                }
            })) as DocsResponse

            if (response.success) {
                setDocuments(response.data.docs)
                setTotal(response.data.total)
            } else {
                setError("Failed to load documents")
            }
        } catch (err: any) {
            setError(err.message || "Failed to load documents")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this document?")) return

        try {
            setDeleting(id)
            const response = {} //await ApiInstance.deleteDoc(id)
            if (response.success) {
                setDocuments(documents.filter((doc) => doc.id !== id))
                setTotal(total - 1)
            } else {
                setError("Failed to delete document")
            }
        } catch (err: any) {
            setError(err.message || "Failed to delete document")
        } finally {
            setDeleting(null)
        }
    }

    const copyShareLink = (id: string) => {
        const link = `${window.location.origin}/sign/${id}`
        navigator.clipboard.writeText(link)
        alert("Share link copied to clipboard!")
    }

    const totalPages = Math.ceil(total / limit)

    if (loading && documents.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="flex gap-2">
                <Input
                    placeholder="Search documents..."
                    value={searchKeyword}
                    onChange={(e) => {
                        setSearchKeyword(e.target.value)
                        setPage(1)
                    }}
                    className="max-w-sm"
                />
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Signed On</TableHead>
                            <TableHead>IPs</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No documents found
                                </TableCell>
                            </TableRow>
                        ) : (
                            documents.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{doc.title}</p>
                                                <p className="text-xs text-muted-foreground">{doc.originalName}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {doc.isSigned ? (
                                            <Badge variant="secondary" className="flex w-fit gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Signed
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">Pending</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {doc.signedAt ? new Date(doc.signedAt).toLocaleDateString() : "—"}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {doc.ipWhitelist.length > 0 ? (
                                            <Badge variant="outline">{doc.ipWhitelist.length}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">None</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="ghost" onClick={() => copyShareLink(doc.id)} title="Copy share link">
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                            <Link to={`/dashboard/documents/${doc.id}`}>
                                                <Button size="sm" variant="ghost" title="Edit">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(doc.id)}
                                                disabled={deleting === doc.id}
                                            >
                                                {deleting === doc.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {totalPages > 1 && (
                <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1 || loading}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages || loading}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
