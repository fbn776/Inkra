import {useEffect, useRef, useState} from "react";
import {useParams} from "react-router";
import {useMutation, useQuery} from "@tanstack/react-query";
import {signDoc, viewDoc} from "@/lib/api";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Label} from "@/components/ui/label";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {AlertCircle, CheckCircle2, Loader2, Send,} from "lucide-react";
import ApiInstance from "@/lib/axios.ts";
import {PDFDocument} from "pdf-lib";

export default function SignDocPage() {
    const {"doc-id": docId} = useParams<{ "doc-id": string }>();

    const [pdfLoader, setPdfLoader] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);

    const [signerName, setSignerName] = useState("");
    const [remarks, setRemarks] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const {data, isLoading, isError} = useQuery({
        queryKey: ["view-doc", docId],
        queryFn: () => viewDoc(docId!),
        enabled: !!docId,
    });

    /**
     * Fetch PDF → create Blob URL
     */
    useEffect(() => {
        if (!data?.data?.originalPath) return;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPdfLoader(true);

        let cancelled = false;
        ApiInstance.get(data.data.originalPath, {
            responseType: "arraybuffer",
        })
            .then((res) => {
                if (cancelled) return;

                const blob = new Blob([res.data], {
                    type: "application/pdf",
                });

                const url = URL.createObjectURL(blob);

                setBlobUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return url;
                });
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Error fetching original PDF:", err);
                setPdfError("Failed to load PDF. Please try again.");
            })
            .finally(() => {
                if (!cancelled) setPdfLoader(false);
            })

        return () => {
            cancelled = true;
        };
    }, [data]);


    useEffect(() => {
        if (!blobUrl || !iframeRef.current) return;

        const viewerUrl = new URL(
            `${import.meta.env.BASE_URL}pdfjs-viewer/viewer.html`,
            window.location.origin
        );

        iframeRef.current.src = `${viewerUrl}?file=${encodeURIComponent(blobUrl)}`;
    }, [blobUrl]);


    useEffect(() => {
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [blobUrl]);


    const doc = data?.data;

    const signMutation = useMutation({
        mutationFn: async () => {
            const viewerWindow: any = iframeRef?.current?.contentWindow;

            if (!viewerWindow || !viewerWindow.PDFViewerApplication) {
                console.log("PDF viewer not loaded");
                throw new Error("PDF viewer not loaded");
            }

            const app = viewerWindow.PDFViewerApplication;

            const annotationStorage = app.pdfDocument.annotationStorage;

            if (annotationStorage.size === 0) {
                throw new Error("Please add your signature to the document before submitting.");
            }

            const rawPdfBytes = await app.pdfDocument.saveDocument(app.pdfDocument.annotationStorage);
            const pdfBytes = new Uint8Array(rawPdfBytes);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            pdfDoc.getForm().flatten();
            const flattenedPdfBytes = await pdfDoc.save();

            const blob = new Blob([flattenedPdfBytes as BlobPart], {type: 'application/pdf'});

            const formData = new FormData();

            formData.append("file", blob, `signed_${doc?.originalName}`);
            formData.append("remarks", remarks);
            formData.append("metadata", signerName);

            return signDoc(docId!, formData);
        },
        onSuccess: () => {
            setSubmitSuccess(true);
        },
    });

    if (doc?.isSigned) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 p-3 rounded-full bg-green-500/10">
                            <CheckCircle2 className="h-8 w-8 text-green-500"/>
                        </div>
                        <CardTitle>Document Already Signed</CardTitle>
                        <CardDescription>
                            This document has already been signed and cannot be modified.
                        </CardDescription>
                    </CardHeader>
                    {doc.signedAt && (
                        <CardContent className="text-center text-sm text-muted-foreground">
                            Signed on {new Date(doc.signedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }

    if (submitSuccess) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 p-3 rounded-full bg-green-500/10">
                            <CheckCircle2 className="h-8 w-8 text-green-500"/>
                        </div>
                        <CardTitle>Document Signed Successfully!</CardTitle>
                        <CardDescription>
                            Thank you for signing the document. The document owner has been notified.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
            </div>
        );
    }

    if (pdfError || isError || !doc) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10">
                            <AlertCircle className="h-8 w-8 text-destructive"/>
                        </div>
                        <CardTitle>Document Not Found</CardTitle>
                        <CardDescription>
                            This document doesn't exist, has been deleted, or you don't have permission to view it.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background px-4 py-6 w-full flex gap-6">
            {/* PDF Viewer */}
            <div className="flex-3 border">
                {pdfLoader ?
                    <div className="size-full flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                    </div> :
                    <iframe ref={iframeRef} width="100%" height="100%"/>
                }
            </div>

            {/* Signing Panel */}
            <div className="flex-1 space-y-4">
                {/* Signer Details */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Your Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="signerName">Full Name</Label>
                            <Input
                                id="signerName"
                                value={signerName}
                                onChange={(e) => setSignerName(e.target.value)}
                                placeholder="Enter your full name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="remarks">Remarks (Optional)</Label>
                            <Textarea
                                id="remarks"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Any additional notes"
                                rows={2}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Submit */}
                <Card>
                    <CardContent className="pt-6">
                        {signMutation.isError && (
                            <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
                                {signMutation.error.message}
                            </div>
                        )}

                        <Button
                            className="w-full gap-2"
                            size="lg"
                            onClick={() => signMutation.mutate()}
                            disabled={pdfLoader || signMutation.isPending}
                        >
                            {signMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4"/>
                                    Submit Signed Document
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}