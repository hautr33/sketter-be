class RESDocument {
	public statusCode: number;

	public document;

	public message;

	public maxPage = 1;

	public currentPage = 1;

	constructor(statusCode: number, message: string, document: any) {
		this.statusCode = statusCode;
		this.document = document;
		this.message = message;
	}

	setMaxPage(maxPage: number): void {
		this.maxPage = maxPage;
	}

	setCurrentPage(currentPage: number): void {
		this.currentPage = currentPage;
	}
}

export default RESDocument;