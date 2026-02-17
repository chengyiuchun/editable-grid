import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Page from '../page'

describe('Page', () => {
    it('renders the grid and toolbar', () => {
        render(<Page />)

        // Check for toolbar buttons
        const addButton = screen.getByRole('button', { name: /add row/i })
        const deleteButton = screen.getByRole('button', { name: /delete rows/i })
        const resetButton = screen.getByRole('button', { name: /reset/i })

        expect(addButton).toBeInTheDocument()
        expect(deleteButton).toBeInTheDocument()
        expect(resetButton).toBeInTheDocument()
    })

    it('renders the diff panel heading', () => {
        render(<Page />)

        const diffHeading = screen.getByRole('heading', { name: /changes \(delta\/diff\)/i })
        expect(diffHeading).toBeInTheDocument()
    })
})