import { createEntityAdapter, createSelector, } from "@reduxjs/toolkit";
import {apiSlice} from "../api/apiSlice"

const usersAdapter = createEntityAdapter()
const initialState = usersAdapter.getInitialState()

export const usersApiSlice = apiSlice.injectEndpoints({
    endpoints: builder => ({
        getUsers: builder.query({
            query: () => "/users",
            transformResponse: result => {
                return usersAdapter.setAll(initialState, result)
            },
            providesTags: (result, error, arg) => [
                { type: 'User', id: "LIST" },
                ...result.ids.map(id => ({ type: 'User', id }))
            ]
        })
    })
})
export const {useGetUsersQuery} = usersApiSlice

export const selectUsersResult = usersApiSlice.endpoints.getUsers.select()
const selectUsersResultData = createSelector(
    selectUsersResult, 
    result => result.data
)
export const {
    selectAll:selectAllUsers,
    selectById:selectUserById,
    selectIds:selectUserIds,
} = usersAdapter.getSelectors(state => selectUsersResultData(state) ?? initialState)